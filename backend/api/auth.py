"""Auth endpoints: register, login, me."""
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr, field_validator

from auth.db import create_auth_user, get_auth_by_email, get_auth_by_user_id, email_exists
from auth.security import hash_password, verify_password, create_access_token, decode_token
from graph.queries import create_user, get_user

router = APIRouter(prefix="/auth", tags=["auth"])
_bearer = HTTPBearer(auto_error=False)


class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_length(cls, v: str) -> str:
        if len(v) < 6:
            raise ValueError("Пароль має містити мінімум 6 символів")
        return v

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Ім'я не може бути порожнім")
        return v.strip()


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    user_id: str
    name: str
    email: str
    token: str


def _get_current_user_id(credentials: HTTPAuthorizationCredentials | None = Depends(_bearer)) -> str:
    if not credentials:
        raise HTTPException(status_code=401, detail="Потрібна авторизація")
    payload = decode_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=401, detail="Недійсний токен")
    return payload["sub"]


@router.post("/register", response_model=AuthResponse)
async def register(body: RegisterRequest):
    if email_exists(body.email):
        raise HTTPException(status_code=409, detail="Email вже використовується")

    user_id = create_user(name=body.name, language="ua")
    pw_hash = hash_password(body.password)
    create_auth_user(
        user_id=user_id,
        email=body.email,
        password_hash=pw_hash,
        created_at=datetime.now(timezone.utc).isoformat(),
    )
    token = create_access_token(user_id, body.email)
    return AuthResponse(user_id=user_id, name=body.name, email=body.email, token=token)


@router.post("/login", response_model=AuthResponse)
async def login(body: LoginRequest):
    auth = get_auth_by_email(body.email)
    if not auth or not verify_password(body.password, auth["password_hash"]):
        raise HTTPException(status_code=401, detail="Невірний email або пароль")

    user = get_user(auth["user_id"])
    name = user["name"] if user else ""
    token = create_access_token(auth["user_id"], body.email)
    return AuthResponse(user_id=auth["user_id"], name=name, email=body.email, token=token)


@router.get("/me")
async def me(user_id: str = Depends(_get_current_user_id)):
    user = get_user(user_id)
    auth = get_auth_by_user_id(user_id)
    if not user or not auth:
        raise HTTPException(status_code=404, detail="Користувача не знайдено")
    return {
        "user_id": user_id,
        "name": user["name"],
        "email": auth["email"],
        "language": user["language"],
        "created_at": user["created_at"],
    }
