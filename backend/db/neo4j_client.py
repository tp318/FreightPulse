"""
Neo4j client — async wrapper around the official neo4j Python driver.
Provides query helpers used by the decision engine.
"""
import logging
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)

_driver = None
_neo4j_failed = False


def _get_driver():
    global _driver, _neo4j_failed
    if _neo4j_failed:
        return None
    if _driver is None:
        try:
            from neo4j import GraphDatabase
            from core.config import settings

            if settings.neo4j_uri.lower() == "none":
                logger.info("Neo4j disabled via config (NEO4J_URI=none).")
                _neo4j_failed = True
                return None

            _driver = GraphDatabase.driver(
                settings.neo4j_uri,
                auth=(settings.neo4j_user, settings.neo4j_password),
                connection_timeout=2.0,
            )
            logger.info(f"Neo4j driver connected to {settings.neo4j_uri}")
        except ImportError:
            logger.warning("neo4j package not installed; Neo4j disabled.")
            _neo4j_failed = True
        except Exception as e:
            logger.warning(f"Neo4j connection failed: {e}")
            _neo4j_failed = True
    return _driver


def run_query(cypher: str, params: Optional[Dict] = None) -> List[Dict[str, Any]]:
    """Run a Cypher query and return a list of record dicts."""
    global _neo4j_failed
    if _neo4j_failed:
        return []
    driver = _get_driver()
    if driver is None:
        return []
    try:
        with driver.session() as session:
            result = session.run(cypher, params or {})
            return [dict(record) for record in result]
    except Exception as e:
        logger.error(f"Neo4j query failed: {e}\nQuery: {cypher}")
        err_str = str(e).lower()
        if "connect" in err_str or "refused" in err_str or "service" in err_str or "driver" in err_str or "establish" in err_str:
            logger.warning("Disabling Neo4j due to connection failure.")
            _neo4j_failed = True
        return []


def write_disruption_event(event: dict) -> bool:
    """Upsert a DisruptionEvent node in Neo4j."""
    cypher = """
    MERGE (d:DisruptionEvent {id: $id})
    SET d.type        = $type,
        d.severity    = $severity,
        d.description = $description,
        d.detected_at = $detected_at,
        d.port_code   = $port_code
    WITH d
    MATCH (p:Port {code: $port_code})
    MERGE (p)-[:AFFECTED_BY]->(d)
    RETURN d.id AS id
    """
    results = run_query(
        cypher,
        {
            "id": event.get("disruption_id"),
            "type": event.get("type"),
            "severity": event.get("severity"),
            "description": event.get("description"),
            "detected_at": event.get("detected_at"),
            "port_code": event.get("location", {}).get("port_code", "UNKNOWN"),
        },
    )
    return len(results) > 0


def get_affected_shipments(disruption_id: str) -> List[Dict]:
    """
    Traverse from DisruptionEvent → Port → Route → Vessel → Shipment.
    Returns list of dicts with shipment, vessel, route, port data.
    """
    cypher = """
    MATCH (d:DisruptionEvent {id: $disruption_id})<-[:AFFECTED_BY]-(p:Port)
          <-[:VIA_PORT]-(r:Route)<-[:ON_ROUTE]-(v:Vessel)<-[:ON_VESSEL]-(s:Shipment)
    OPTIONAL MATCH (s)-[:HANDLED_BY]->(f:Forwarder)
    RETURN
        s.id          AS shipment_id,
        s.cargo_type  AS cargo_type,
        s.value       AS value,
        s.priority    AS priority,
        s.deadline    AS deadline,
        s.customer    AS customer,
        v.imo         AS vessel_imo,
        v.name        AS vessel_name,
        r.id          AS route_id,
        r.name        AS route_name,
        p.code        AS port_code,
        p.name        AS port_name,
        f.id          AS forwarder_id,
        f.name        AS forwarder_name,
        f.phone       AS forwarder_phone
    """
    return run_query(cypher, {"disruption_id": disruption_id})


def get_alt_routes(
    from_port_code: str, to_port_code: str, excluded_port_code: str
) -> List[Dict]:
    """
    Find alternative port routes avoiding the disrupted port.
    Uses allShortestPaths excluding the disrupted port.
    """
    cypher = """
    MATCH (start:Port {code: $from_code}), (end:Port {code: $to_code})
    MATCH path = allShortestPaths((start)-[:VIA_PORT*]-(end))
    WHERE NONE(p IN nodes(path) WHERE p.code = $excluded)
    RETURN [n IN nodes(path) | {code: n.code, name: n.name, lat: n.lat, lon: n.lon}] AS ports,
           length(path) AS hops
    LIMIT 3
    """
    return run_query(
        cypher,
        {
            "from_code": from_port_code,
            "to_code": to_port_code,
            "excluded": excluded_port_code,
        },
    )


def is_graph_seeded() -> bool:
    """Check if the graph has any Port nodes (used to decide whether to seed)."""
    results = run_query("MATCH (p:Port) RETURN count(p) AS cnt LIMIT 1")
    return (results[0]["cnt"] if results else 0) > 0


def close():
    global _driver
    if _driver:
        _driver.close()
        _driver = None
