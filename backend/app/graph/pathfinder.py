import heapq
import itertools
import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from app.core.config import get_settings
from app.graph.seeder import PORTS, SEA_ROUTES, LAND_ROUTES


@dataclass(frozen=True)
class Edge:
    src: str
    dst: str
    mode: str
    distance_nm: float
    hours: float
    cost: float


PORT_COORDS = {p[0]: (p[2], p[3]) for p in PORTS}


def haversine_nm(a: str, b: str) -> float:
    lat1, lon1 = PORT_COORDS.get(a, (0, 0))
    lat2, lon2 = PORT_COORDS.get(b, (0, 0))
    r_nm = 3440.065
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi, dlambda = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
    h = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlambda / 2) ** 2
    return 2 * r_nm * math.asin(math.sqrt(h))


def _fallback_edges() -> list[Edge]:
    edges: list[Edge] = []
    for src, dst, dist, hours, cost in SEA_ROUTES:
        edges.extend([Edge(src, dst, "sea", dist, hours, cost), Edge(dst, src, "sea", dist, hours, cost)])
    for src, dst, mode, dist, hours, cost in LAND_ROUTES:
        nm = dist * 0.539957
        edges.extend([Edge(src, dst, mode, nm, hours, cost), Edge(dst, src, mode, nm, hours, cost)])
    return edges


async def _edges_from_neo4j(session) -> list[Edge]:
    if session is None:
        return _fallback_edges()
    result = await session.run(
        "MATCH (a:Port)-[:CONNECTED_VIA]->(r:Route)-[:TO]->(b:Port) "
        "RETURN a.code AS src, b.code AS dst, r.mode AS mode, r.distance_nm AS distance, r.avg_transit_hours AS hours, r.cost_per_container AS cost"
    )
    edges = [Edge(r["src"], r["dst"], r["mode"], float(r["distance"]), float(r["hours"]), float(r["cost"])) async for r in result]
    return edges or _fallback_edges()


async def find_alternative_paths(
    origin_port: str,
    destination_port: str,
    blocked_ports: list[str] | None = None,
    blocked_vessels: list[str] | None = None,
    current_time: datetime | None = None,
    session=None,
    max_paths: int = 4,
) -> list[dict]:
    settings = get_settings()
    blocked = set(blocked_ports or []) - {origin_port, destination_port}
    now = current_time or datetime.now(timezone.utc)
    edges = [e for e in await _edges_from_neo4j(session) if e.src not in blocked and e.dst not in blocked]
    adjacency: dict[str, list[Edge]] = {}
    for edge in edges:
        adjacency.setdefault(edge.src, []).append(edge)

    def score(edge: Edge) -> float:
        return settings.PATH_COST_WEIGHT * edge.cost + settings.PATH_TIME_WEIGHT * edge.hours * 20

    def heuristic(port: str) -> float:
        return (haversine_nm(port, destination_port) / 20.0) * settings.PATH_TIME_WEIGHT * 20

    found: list[dict] = []
    counter = itertools.count()
    heap: list[tuple[float, int, float, str, list[Edge]]] = [(heuristic(origin_port), next(counter), 0.0, origin_port, [])]
    seen: dict[tuple[str, tuple[str, ...]], float] = {}
    while heap and len(found) < max_paths:
        _, _, g, port, path = heapq.heappop(heap)
        visited = tuple(e.dst for e in path)
        if port == destination_port and path:
            cost = sum(e.cost for e in path)
            hours = sum(e.hours for e in path)
            modes = {e.mode for e in path}
            found.append({
                "ports": [origin_port] + [e.dst for e in path],
                "mode": "multimodal" if len(modes) > 1 else next(iter(modes), "sea"),
                "total_cost": cost,
                "transit_hours": hours,
                "eta": (now + timedelta(hours=hours)).isoformat(),
                "risk": min(0.75, 0.08 + 0.03 * len(path) + 0.08 * len(set(blocked_vessels or []))),
                "legs": [e.__dict__ for e in path],
            })
            continue
        for edge in adjacency.get(port, []):
            if edge.dst in visited or len(path) >= 7:
                continue
            key = (edge.dst, visited + (edge.dst,))
            ng = g + score(edge)
            if ng >= seen.get(key, float("inf")):
                continue
            seen[key] = ng
            heapq.heappush(heap, (ng + heuristic(edge.dst), next(counter), ng, edge.dst, path + [edge]))

    wait_hours = 24 + 72 * (1 if destination_port in (blocked_ports or []) else 0)
    wait = {
        "ports": [origin_port, destination_port],
        "mode": "wait",
        "total_cost": 0.0,
        "transit_hours": wait_hours,
        "eta": (now + timedelta(hours=wait_hours)).isoformat(),
        "risk": 0.55 if blocked_ports else 0.2,
        "legs": [],
    }
    return [wait] + found[: max_paths - 1]
