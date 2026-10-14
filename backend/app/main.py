from contextlib import asynccontextmanager
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.logging import setup_logging, logger
from app.core.exceptions import DocuMindException
from app.models.database import init_db
from app.api.routes import health, documents, chat, conversations, settings as settings_routes

setup_logging()

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing DocuMind AI backend...")
    init_db()
    settings.ensure_directories()
    logger.info(f"DocuMind AI backend running on http://{settings.HOST}:{settings.PORT}")
    yield
    logger.info("DocuMind AI backend shutting down...")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Local Document-Based RAG Chatbot API using Ollama, ChromaDB, and SentenceTransformers.",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom Exception Handler
@app.exception_handler(DocuMindException)
async def documind_exception_handler(request: Request, exc: DocuMindException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.message, "status_code": exc.status_code}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled server error: {exc}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An internal server error occurred.", "status_code": 500}
    )

# Include API Routers under /api
app.include_router(health.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(conversations.router, prefix="/api")
app.include_router(settings_routes.router, prefix="/api")

@app.get("/")
def root():
    return {
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/docs",
        "health": "/api/health"
    }
