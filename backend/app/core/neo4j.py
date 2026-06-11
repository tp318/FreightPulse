from collections.abc import AsyncIterator
from neo4j import AsyncDriver, AsyncGraphDatabase
from app.core.config import get_settings

_driver: AsyncDriver | None = None


def get_neo4j_driver() -> AsyncDriver:
    global _driver
    if _driver is None:
        s = get_settings()
        _driver = AsyncGraphDatabase.driver(s.NEO4J_URI, auth=(s.NEO4J_USER, s.NEO4J_PASSWORD))
    return _driver


async def neo4j_session() -> AsyncIterator:
    driver = get_neo4j_driver()
    async with driver.session() as session:
        yield session


async def close_neo4j_driver() -> None:
    global _driver
    if _driver is not None:
        await _driver.close()
        _driver = None
