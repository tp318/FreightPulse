import pytest
from app.graph.pathfinder import find_alternative_paths


@pytest.mark.asyncio
async def test_pathfinder_returns_path_avoiding_blocked_port():
    paths = await find_alternative_paths("INNSA", "NLRTM", blocked_ports=["SGSIN"], blocked_vessels=[], session=None)
    assert paths
    assert any("SGSIN" not in p["ports"] for p in paths)
