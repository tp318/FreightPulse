import structlog
import pathlib
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.responses import HTMLResponse
from app.api import disruptions, health, shipments, unified
from app.core.neo4j import close_neo4j_driver

logger = structlog.get_logger()


@asynccontextmanager
async def lifespan(app: FastAPI):
    from app.core.config import get_settings
    from app.core.database import create_all_for_dev
    settings = get_settings()
    if settings.DATABASE_URL.startswith("sqlite"):
        await create_all_for_dev()
    logger.info("startup_complete")
    yield
    await close_neo4j_driver()
    logger.info("shutdown_complete")


def create_app() -> FastAPI:
    app = FastAPI(title="Logistics Recovery Intelligence Engine", version="1.0.0", lifespan=lifespan)
    app.include_router(health.router)
    app.include_router(shipments.router)
    app.include_router(disruptions.router)
    app.include_router(unified.router)

    @app.get("/", response_class=HTMLResponse)
    async def get_dashboard():
        template_path = pathlib.Path(__file__).parent / "templates" / "dashboard.html"
        try:
            with open(template_path, "r", encoding="utf-8") as f:
                return f.read()
        except FileNotFoundError:
            return "Dashboard HTML template not found."

    return app


app = create_app()
