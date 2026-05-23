import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from dotenv import load_dotenv
load_dotenv()

from api.limiter import limiter
from graph.schema import init_schema
from api.auth import router as auth_router
from api.chat import router as chat_router
from api.health import router as health_router
from api.learning import router as learning_router
from api.finance import router as finance_router
from api.health_domain import router as health_domain_router
from api.insights import router as insights_router
from api.ml import router as ml_router
from api.monobank import router as monobank_router
from api.user import router as user_router
from api.report import router as report_router
from api.workout import router as workout_router
from api.productivity import router as productivity_router
from api.reflection import router as reflection_router
from api.relationships import router as relationships_router
from api.career import router as career_router
from api.subscriptions import router as subscriptions_router
from api.goals import router as goals_router
from api.networth import router as networth_router
from triggers import engine as trigger_engine

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_schema()
    trigger_engine.start()
    logger.info("Knome API started")
    yield
    trigger_engine.stop()
    logger.info("Knome API stopped")


app = FastAPI(title="Knome API", version="0.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "Внутрішня помилка сервера. Спробуй пізніше."},
    )


app.include_router(auth_router, prefix="/api")
app.include_router(monobank_router, prefix="/api")
app.include_router(chat_router)
app.include_router(health_router, prefix="/api")
app.include_router(learning_router, prefix="/api")
app.include_router(finance_router, prefix="/api")
app.include_router(health_domain_router, prefix="/api")
app.include_router(insights_router, prefix="/api")
app.include_router(ml_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(report_router, prefix="/api")
app.include_router(workout_router, prefix="/api")
app.include_router(productivity_router, prefix="/api")
app.include_router(reflection_router)
app.include_router(relationships_router)
app.include_router(career_router)
app.include_router(subscriptions_router)
app.include_router(goals_router)
app.include_router(networth_router)
