"""
Mock AIS generator — emits plausible vessel position updates for the three
vessels in the shipments data, moving them along their routes at realistic speeds.

Falls back automatically if AIS_API_KEY is not set (which is the expected case
for a local demo). The generator advances position by ~0.15° per poll (≈14 knots).
Occasionally introduces a 50nm deviation to trigger AIS-based disruption detection.
"""
import asyncio
import logging
import math
import random
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ─── Vessel definitions ──────────────────────────────────────────────────────
# Each vessel has: imo, name, origin (lat, lon), destination (lat, lon), current position

_vessels = [
    {
        "imo": "IMO9876001",
        "name": "MSC MAYA",
        "origin":      [22.84,  69.70],   # Mundra
        "destination": [51.90,   4.48],   # Rotterdam
        "waypoints": [
            [22.84,  69.70],  # Mundra
            [1.29,  103.85],  # Singapore
            [51.90,   4.48],  # Rotterdam
        ],
        "_wp_idx": 0,
        "_lat": 22.84,
        "_lon": 69.70,
        "_deviation": False,
    },
    {
        "imo": "IMO9876002",
        "name": "EVER GIVEN II",
        "origin":      [18.95, 72.95],    # JNPT
        "destination": [53.55,  9.97],    # Hamburg
        "waypoints": [
            [18.95, 72.95],
            [25.20, 55.27],  # Dubai
            [53.55,  9.97],
        ],
        "_wp_idx": 0,
        "_lat": 18.95,
        "_lon": 72.95,
        "_deviation": False,
    },
    {
        "imo": "IMO9876003",
        "name": "COSCO SHANGHAI",
        "origin":      [13.08, 80.27],    # Chennai
        "destination": [51.96,  1.35],    # Felixstowe
        "waypoints": [
            [13.08, 80.27],
            [1.29,  103.85],  # Singapore
            [51.96,   1.35],
        ],
        "_wp_idx": 0,
        "_lat": 13.08,
        "_lon": 80.27,
        "_deviation": False,
    },
]

# Step size per poll: ~0.15° ≈ ~10nm (realistic for 30s interval at 14kn)
_STEP = 0.15
_DEVIATION_CHANCE = 0.03   # 3% chance of triggering a deviation each poll
_DEVIATION_NM = 0.5         # degrees of deviation to inject


def _move_vessel(vessel: dict) -> dict:
    """Advance a vessel one step toward its next waypoint."""
    wp_idx = vessel["_wp_idx"]
    waypoints = vessel["waypoints"]

    if wp_idx >= len(waypoints) - 1:
        # Reset to origin for demo loop
        vessel["_wp_idx"] = 0
        vessel["_lat"] = waypoints[0][0]
        vessel["_lon"] = waypoints[0][1]
        vessel["_deviation"] = False
        return vessel

    target_lat, target_lon = waypoints[wp_idx + 1]
    dlat = target_lat - vessel["_lat"]
    dlon = target_lon - vessel["_lon"]
    dist = math.sqrt(dlat**2 + dlon**2)

    if dist < _STEP:
        # Arrived at waypoint — advance to next
        vessel["_wp_idx"] += 1
        vessel["_lat"] = target_lat
        vessel["_lon"] = target_lon
    else:
        # Move one step toward target
        factor = _STEP / dist
        vessel["_lat"] += dlat * factor
        vessel["_lon"] += dlon * factor

    # Random deviation injection
    if random.random() < _DEVIATION_CHANCE:
        vessel["_deviation"] = True
        vessel["_lat"] += _DEVIATION_NM * (1 if random.random() > 0.5 else -1)
        vessel["_lon"] += _DEVIATION_NM * (1 if random.random() > 0.5 else -1)
    else:
        vessel["_deviation"] = False

    return vessel


def _expected_position(vessel: dict) -> tuple:
    """Return the 'on-route' expected position (without deviation)."""
    wp_idx = min(vessel["_wp_idx"], len(vessel["waypoints"]) - 2)
    return vessel["waypoints"][wp_idx]


def _distance_from_route_nm(vessel: dict) -> float:
    """Approximate distance from expected route in nautical miles."""
    exp_lat, exp_lon = _expected_position(vessel)
    dlat = vessel["_lat"] - exp_lat
    dlon = vessel["_lon"] - exp_lon
    return round(math.sqrt(dlat**2 + dlon**2) * 60, 1)   # 1° ≈ 60nm


async def ais_polling_loop():
    """Main AIS polling loop — runs forever, publishes every 30 seconds."""
    from kafka.producer import publish
    from db.timescale import write_ais_position

    logger.info("AIS mock generator started.")
    while True:
        for vessel in _vessels:
            _move_vessel(vessel)
            distance_nm = _distance_from_route_nm(vessel)
            speed = round(random.uniform(12.5, 15.5), 1)
            heading = round(random.uniform(0, 360), 1)

            payload = {
                "vessel_imo":             vessel["imo"],
                "vessel_name":            vessel["name"],
                "lat":                    round(vessel["_lat"], 4),
                "lon":                    round(vessel["_lon"], 4),
                "speed_knots":            speed,
                "heading":                heading,
                "navigational_status":    "Under way using engine",
                "distance_from_route_nm": distance_nm,
                "deviation_detected":     vessel["_deviation"],
                "timestamp":              datetime.now(timezone.utc).isoformat(),
            }

            try:
                publish("ingestion.ais", payload, source="ais-mock")
                write_ais_position(
                    vessel_imo=vessel["imo"],
                    vessel_name=vessel["name"],
                    lat=vessel["_lat"],
                    lon=vessel["_lon"],
                    speed=speed,
                    heading=heading,
                )
            except Exception as e:
                logger.debug(f"AIS publish error: {e}")

            if vessel["_deviation"]:
                logger.info(
                    f"⚠️  AIS deviation: {vessel['name']} is {distance_nm}nm off route"
                )

        await asyncio.sleep(30)
