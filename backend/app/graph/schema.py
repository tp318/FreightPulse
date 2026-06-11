CREATE_CONSTRAINTS = [
    "CREATE CONSTRAINT port_code IF NOT EXISTS FOR (p:Port) REQUIRE p.code IS UNIQUE",
    "CREATE CONSTRAINT vessel_name IF NOT EXISTS FOR (v:Vessel) REQUIRE v.name IS UNIQUE",
    "CREATE CONSTRAINT carrier_name IF NOT EXISTS FOR (c:Carrier) REQUIRE c.name IS UNIQUE",
    "CREATE CONSTRAINT route_id IF NOT EXISTS FOR (r:Route) REQUIRE r.id IS UNIQUE",
]


async def create_graph_schema(session) -> None:
    for query in CREATE_CONSTRAINTS:
        await session.run(query)
