from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from graph.schema import init_schema
from api.chat import router as chat_router
from api.health import router as health_router
from api.learning import router as learning_router
from api.finance import router as finance_router
from api.health_domain import router as health_domain_router
from api.insights import router as insights_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_schema()
    yield


app = FastAPI(title="Knome API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)
app.include_router(health_router, prefix="/api")
app.include_router(learning_router, prefix="/api")
app.include_router(finance_router, prefix="/api")
app.include_router(health_domain_router, prefix="/api")
app.include_router(insights_router, prefix="/api")
