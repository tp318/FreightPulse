from app.graph.schema import create_graph_schema

PORTS = [
    ("INNSA", "Nhava Sheva", 18.949, 72.951, "IN", 0.31), ("INMAA", "Chennai", 13.082, 80.292, "IN", 0.34),
    ("INKOL", "Kolkata", 22.568, 88.363, "IN", 0.39), ("INMUN", "Mundra", 22.735, 69.704, "IN", 0.28),
    ("INCOK", "Cochin", 9.966, 76.242, "IN", 0.23), ("SGSIN", "Singapore", 1.265, 103.822, "SG", 0.25),
    ("LKCMB", "Colombo", 6.95, 79.85, "LK", 0.29), ("AEAUH", "Abu Dhabi", 24.466, 54.366, "AE", 0.27),
    ("AEDXB", "Jebel Ali", 25.011, 55.061, "AE", 0.26), ("OMSLL", "Salalah", 16.956, 54.007, "OM", 0.21),
    ("NLRTM", "Rotterdam", 51.95, 4.14, "NL", 0.32), ("DEHAM", "Hamburg", 53.546, 9.966, "DE", 0.37),
    ("BEANR", "Antwerp", 51.264, 4.399, "BE", 0.35), ("GBFXT", "Felixstowe", 51.954, 1.351, "GB", 0.33),
    ("FRLEH", "Le Havre", 49.49, 0.1, "FR", 0.26), ("ESALG", "Algeciras", 36.14, -5.44, "ES", 0.24),
    ("USNYC", "New York", 40.672, -74.045, "US", 0.42), ("USLAX", "Los Angeles", 33.74, -118.27, "US", 0.45),
    ("USSEA", "Seattle", 47.606, -122.332, "US", 0.29), ("CNSHA", "Shanghai", 31.23, 121.49, "CN", 0.41),
    ("CNNGB", "Ningbo", 29.868, 121.544, "CN", 0.36), ("HKHKG", "Hong Kong", 22.319, 114.169, "HK", 0.31),
    ("KRPUS", "Busan", 35.179, 129.075, "KR", 0.3), ("JPTYO", "Tokyo", 35.65, 139.77, "JP", 0.24),
    ("ZADUR", "Durban", -29.88, 31.05, "ZA", 0.33), ("EGPSD", "Port Said", 31.265, 32.301, "EG", 0.22),
]

CARRIERS = [("Maersk", "2M"), ("MSC", "2M"), ("CMA CGM", "Ocean"), ("Hapag-Lloyd", "THE"), ("ONE", "THE")]
VESSELS = [
    ("TestVessel", "9000001", "Maersk", 11000, "INNSA", "active"), ("Arabian Star", "9000002", "MSC", 9000, "AEAUH", "active"),
    ("Bay Runner", "9000003", "CMA CGM", 12000, "SGSIN", "active"), ("Rhine Bridge", "9000004", "Hapag-Lloyd", 8000, "NLRTM", "active"),
    ("Pacific Link", "9000005", "ONE", 10000, "CNSHA", "active"), ("Mumbai Trader", "9000006", "Maersk", 7000, "INMUN", "active"),
    ("Colombo Express", "9000007", "MSC", 6000, "LKCMB", "active"), ("Atlantic Merit", "9000008", "CMA CGM", 13000, "BEANR", "active"),
    ("Baltic Crown", "9000009", "Hapag-Lloyd", 8500, "DEHAM", "active"), ("West Coast Arrow", "9000010", "ONE", 9000, "USLAX", "active"),
]
SEA_ROUTES = [
    ("INNSA", "SGSIN", 2150, 125, 1450), ("INNSA", "LKCMB", 850, 54, 700), ("LKCMB", "SGSIN", 1580, 92, 900),
    ("SGSIN", "NLRTM", 8300, 475, 3900), ("SGSIN", "DEHAM", 8500, 490, 4050), ("SGSIN", "BEANR", 8420, 484, 3980),
    ("INNSA", "AEAUH", 1050, 72, 800), ("AEAUH", "OMSLL", 980, 60, 700), ("OMSLL", "EGPSD", 2700, 155, 1700),
    ("EGPSD", "NLRTM", 3200, 180, 2100), ("NLRTM", "DEHAM", 300, 24, 350), ("NLRTM", "BEANR", 100, 12, 150),
    ("CNSHA", "SGSIN", 2300, 132, 1500), ("CNSHA", "USLAX", 5700, 320, 3100), ("USLAX", "USNYC", 5100, 300, 3300),
    ("INMAA", "SGSIN", 1600, 96, 980), ("INKOL", "SGSIN", 1650, 100, 1000), ("INMUN", "AEAUH", 900, 58, 760),
]
LAND_ROUTES = [("NLRTM", "DEHAM", "rail", 260, 9, 420), ("NLRTM", "BEANR", "road", 95, 3, 180)]


async def seed_graph(session) -> None:
    await create_graph_schema(session)
    for code, name, lat, lon, country, congestion in PORTS:
        await session.run("MERGE (p:Port {code:$code}) SET p += $props", code=code, props={"name": name, "lat": lat, "lon": lon, "country": country, "congestion_level": congestion})
    for name, alliance in CARRIERS:
        await session.run("MERGE (c:Carrier {name:$name}) SET c.alliance=$alliance", name=name, alliance=alliance)
    for name, imo, carrier, capacity, port, status in VESSELS:
        await session.run(
            "MERGE (v:Vessel {name:$name}) SET v.imo=$imo, v.carrier=$carrier, v.capacity_teu=$capacity, v.current_port_code=$port, v.status=$status "
            "WITH v MATCH (c:Carrier {name:$carrier}), (p:Port {code:$port}) MERGE (v)-[:OPERATED_BY]->(c) MERGE (v)-[:DOCKED_AT]->(p)",
            name=name, imo=imo, carrier=carrier, capacity=capacity, port=port, status=status,
        )
    rid = 1
    for src, dst, dist, hours, cost in SEA_ROUTES:
        rid = await _route(session, rid, src, dst, "sea", dist, hours, cost)
        rid = await _route(session, rid, dst, src, "sea", dist, hours, cost)
    for src, dst, mode, dist, hours, cost in LAND_ROUTES:
        rid = await _route(session, rid, src, dst, mode, dist, hours, cost)
        rid = await _route(session, rid, dst, src, mode, dist, hours, cost)
    for carrier, _ in CARRIERS:
        for port, *_ in PORTS[:14]:
            await session.run("MATCH (c:Carrier {name:$carrier}), (p:Port {code:$port}) MERGE (c)-[:SERVES]->(p)", carrier=carrier, port=port)


async def _route(session, rid: int, src: str, dst: str, mode: str, dist: float, hours: float, cost: float) -> int:
    await session.run(
        "MATCH (a:Port {code:$src}), (b:Port {code:$dst}) MERGE (r:Route {id:$id}) "
        "SET r.mode=$mode, r.distance_nm=$dist, r.avg_transit_hours=$hours, r.cost_per_container=$cost, r.valid_from=date('2020-01-01'), r.valid_to=date('2035-01-01') "
        "MERGE (a)-[:CONNECTED_VIA]->(r) MERGE (r)-[:TO]->(b)",
        src=src, dst=dst, id=f"R{rid:04d}", mode=mode, dist=dist, hours=hours, cost=cost,
    )
    return rid + 1
