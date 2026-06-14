"""
Neo4j seed script — builds the freight graph from mock shipment data.
Uses MERGE so it's idempotent (safe to run multiple times).

Run directly:  python -m scripts.seed_neo4j
Or called on startup from main.py when graph is empty.
"""
import logging
import sys
import os

# Allow running as a standalone script
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.neo4j_client import run_query, is_graph_seeded

logger = logging.getLogger(__name__)

# ─── Static reference data ──────────────────────────────────────────────────

PORTS = [
    {"code": "INMUN", "name": "Mundra",     "lat": 22.84,  "lon": 69.70},
    {"code": "INJNP", "name": "JNPT",       "lat": 18.95,  "lon": 72.95},
    {"code": "INMAA", "name": "Chennai",    "lat": 13.08,  "lon": 80.27},
    {"code": "NLRTM", "name": "Rotterdam",  "lat": 51.90,  "lon": 4.48},
    {"code": "DEHAM", "name": "Hamburg",    "lat": 53.55,  "lon": 9.97},
    {"code": "GBFXT", "name": "Felixstowe", "lat": 51.96,  "lon": 1.35},
    {"code": "BEANR", "name": "Antwerp",    "lat": 51.23,  "lon": 4.40},
    {"code": "SGSIN", "name": "Singapore",  "lat": 1.29,   "lon": 103.85},
    {"code": "AEDXB", "name": "Dubai",      "lat": 25.20,  "lon": 55.27},
]

ROUTES = [
    {
        "id": "RT-001",
        "name": "Mundra → Singapore → Rotterdam",
        "ports": ["INMUN", "SGSIN", "NLRTM"],
    },
    {
        "id": "RT-002",
        "name": "JNPT → Dubai → Hamburg",
        "ports": ["INJNP", "AEDXB", "DEHAM"],
    },
    {
        "id": "RT-003",
        "name": "Chennai → Singapore → Felixstowe",
        "ports": ["INMAA", "SGSIN", "GBFXT"],
    },
    {
        "id": "RT-ALT-001",
        "name": "Mundra → Dubai → Antwerp (alt)",
        "ports": ["INMUN", "AEDXB", "BEANR"],
    },
]

VESSELS = [
    {"imo": "IMO9876001", "name": "MSC MAYA"},
    {"imo": "IMO9876002", "name": "EVER GIVEN II"},
    {"imo": "IMO9876003", "name": "COSCO SHANGHAI"},
]

FORWARDERS = [
    {"id": "FWD-001", "name": "Mehta Freight Services",  "phone": "+91-98765-43210"},
    {"id": "FWD-002", "name": "TransOcean Logistics",    "phone": "+91-98123-45678"},
    {"id": "FWD-003", "name": "BlueStar Forwarders",     "phone": "+91-97890-12345"},
]

SHIPMENTS = [
    {
        "id": "SHP-001",
        "cargo_type": "Electronics",
        "value": 1850000,
        "priority": "critical",
        "deadline": "2026-06-22",
        "customer": "TechCorp India",
        "vessel_imo": "IMO9876001",
        "route_id": "RT-001",
        "forwarder_id": "FWD-001",
    },
    {
        "id": "SHP-002",
        "cargo_type": "Textiles",
        "value": 720000,
        "priority": "medium",
        "deadline": "2026-06-28",
        "customer": "Euro Fashion Group",
        "vessel_imo": "IMO9876002",
        "route_id": "RT-002",
        "forwarder_id": "FWD-002",
    },
    {
        "id": "SHP-003",
        "cargo_type": "Pharmaceuticals",
        "value": 2300000,
        "priority": "high",
        "deadline": "2026-07-04",
        "customer": "MedSupply UK",
        "vessel_imo": "IMO9876003",
        "route_id": "RT-003",
        "forwarder_id": "FWD-003",
    },
]


def seed():
    logger.info("Seeding Neo4j graph...")

    # 1. Create Port nodes
    for port in PORTS:
        run_query(
            """
            MERGE (p:Port {code: $code})
            SET p.name = $name, p.lat = $lat, p.lon = $lon
            """,
            port,
        )

    # 2. Create Route nodes + VIA_PORT relationships
    for route in ROUTES:
        run_query(
            """
            MERGE (r:Route {id: $id})
            SET r.name = $name
            """,
            {"id": route["id"], "name": route["name"]},
        )
        for port_code in route["ports"]:
            run_query(
                """
                MATCH (r:Route {id: $route_id}), (p:Port {code: $port_code})
                MERGE (r)-[:VIA_PORT]->(p)
                """,
                {"route_id": route["id"], "port_code": port_code},
            )

    # 3. Create Vessel nodes
    for vessel in VESSELS:
        run_query(
            """
            MERGE (v:Vessel {imo: $imo})
            SET v.name = $name
            """,
            vessel,
        )

    # 4. Create Forwarder nodes
    for fwd in FORWARDERS:
        run_query(
            """
            MERGE (f:Forwarder {id: $id})
            SET f.name = $name, f.phone = $phone
            """,
            fwd,
        )

    # 5. Create Shipment nodes + all relationships
    for ship in SHIPMENTS:
        run_query(
            """
            MERGE (s:Shipment {id: $id})
            SET s.cargo_type = $cargo_type,
                s.value      = $value,
                s.priority   = $priority,
                s.deadline   = $deadline,
                s.customer   = $customer
            """,
            {
                "id": ship["id"],
                "cargo_type": ship["cargo_type"],
                "value": ship["value"],
                "priority": ship["priority"],
                "deadline": ship["deadline"],
                "customer": ship["customer"],
            },
        )
        # Shipment ON_VESSEL Vessel
        run_query(
            """
            MATCH (s:Shipment {id: $ship_id}), (v:Vessel {imo: $vessel_imo})
            MERGE (s)-[:ON_VESSEL]->(v)
            """,
            {"ship_id": ship["id"], "vessel_imo": ship["vessel_imo"]},
        )
        # Vessel ON_ROUTE Route
        run_query(
            """
            MATCH (v:Vessel {imo: $vessel_imo}), (r:Route {id: $route_id})
            MERGE (v)-[:ON_ROUTE]->(r)
            """,
            {"vessel_imo": ship["vessel_imo"], "route_id": ship["route_id"]},
        )
        # Shipment HANDLED_BY Forwarder
        run_query(
            """
            MATCH (s:Shipment {id: $ship_id}), (f:Forwarder {id: $fwd_id})
            MERGE (s)-[:HANDLED_BY]->(f)
            """,
            {"ship_id": ship["id"], "fwd_id": ship["forwarder_id"]},
        )

    logger.info(
        f"✅ Neo4j seeded: {len(PORTS)} ports, {len(ROUTES)} routes, "
        f"{len(VESSELS)} vessels, {len(SHIPMENTS)} shipments, {len(FORWARDERS)} forwarders."
    )


def seed_if_empty():
    """Only seed if the graph has no Port nodes."""
    try:
        if not is_graph_seeded():
            seed()
        else:
            logger.info("Neo4j graph already seeded — skipping.")
    except Exception as e:
        logger.warning(f"Neo4j seed check failed: {e}")


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    seed()
