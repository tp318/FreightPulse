import argparse
import asyncio
import sys
from neo4j.exceptions import Neo4jError, ServiceUnavailable
from app.core.neo4j import get_neo4j_driver
from app.graph.seeder import seed_graph


async def _seed_graph(retries: int = 12, delay: float = 5.0) -> None:
    driver = get_neo4j_driver()
    try:
        for attempt in range(1, retries + 1):
            try:
                async with driver.session() as session:
                    await seed_graph(session)
                return
            except (Neo4jError, ServiceUnavailable, OSError) as exc:
                if attempt == retries:
                    raise RuntimeError("Neo4j graph seed failed after retries") from exc
                await asyncio.sleep(delay)
    finally:
        await driver.close()


def main() -> None:
    parser = argparse.ArgumentParser(prog="lrie")
    parser.add_argument("command", choices=["seed-graph"])
    args = parser.parse_args()
    try:
        if args.command == "seed-graph":
            asyncio.run(_seed_graph())
    except Exception as exc:
        print(str(exc), file=sys.stderr)
        raise SystemExit(1) from exc


if __name__ == "__main__":
    main()
