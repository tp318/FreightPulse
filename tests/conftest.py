import os
import asyncio
from datetime import datetime, timedelta, timezone
import pytest

os.environ.setdefault("API_KEY", "test-key")
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./test_lrie.db")
os.environ.setdefault("NOTIFICATIONS_ENABLED", "false")


@pytest.fixture(autouse=True)
def clean_database():
    from app.core.database import engine
    from app.models.relational import Base

    async def reset() -> None:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.drop_all)
            await conn.run_sync(Base.metadata.create_all)

    asyncio.run(reset())
    yield


class DummyShipment:
    id = "shipment-1"
    origin_port_code = "INNSA"
    destination_port_code = "NLRTM"
    cargo_value = 10_000_000
    eta = datetime.now(timezone.utc) + timedelta(days=5)
    etd = datetime.now(timezone.utc)
    vessel_name = "TestVessel"


class DummyEvent:
    id = "event-1"
    event_type = "severe_weather"
    severity = 0.7
    confidence = 0.85
    affected_ports = ["NLRTM"]
    affected_vessels = []


@pytest.fixture
def shipment():
    return DummyShipment()


@pytest.fixture
def event():
    return DummyEvent()
