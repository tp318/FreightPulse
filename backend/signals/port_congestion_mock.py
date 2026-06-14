"""
Port congestion mock generator — emits realistic congestion metrics for
major ports, with occasional spikes to trigger disruption detection.

Threshold for detection: avg_wait_hours > 24.
"""
import asyncio
import logging
import random
from datetime import datetime, timezone

logger = logging.getLogger(__name__)

# ─── Port baselines ──────────────────────────────────────────────────────────
_PORTS = [
    {"code": "NLRTM", "name": "Rotterdam",  "baseline_wait": 8.0,  "baseline_occupancy": 0.72},
    {"code": "DEHAM", "name": "Hamburg",    "baseline_wait": 12.0, "baseline_occupancy": 0.68},
    {"code": "GBFXT", "name": "Felixstowe", "baseline_wait": 6.0,  "baseline_occupancy": 0.60},
    {"code": "BEANR", "name": "Antwerp",    "baseline_wait": 9.0,  "baseline_occupancy": 0.65},
    {"code": "SGSIN", "name": "Singapore",  "baseline_wait": 5.0,  "baseline_occupancy": 0.55},
]

_SPIKE_CHANCE = 0.15          # 15% chance of spike per port per poll
_SPIKE_MULTIPLIER = 3.5       # spike multiplier on baseline
_first_poll = True            # guarantee a spike on first poll for demo


async def port_congestion_polling_loop():
    """Main congestion polling loop — runs forever, publishes every 60 seconds."""
    from kafka.producer import publish
    from db.timescale import write_port_congestion

    global _first_poll
    logger.info("Port congestion mock generator started.")
    while True:
        for port in _PORTS:
            # Apply small noise ± 20% of baseline
            noise = random.uniform(0.8, 1.2)
            avg_wait = port["baseline_wait"] * noise

            # On first poll: guarantee Rotterdam spikes to trigger detection immediately
            if _first_poll and port["code"] == "NLRTM":
                avg_wait = 42.0  # well above 24h threshold
                logger.info(
                    f"🚨 [DEMO] Forced congestion spike on first poll: {port['name']} → {avg_wait:.1f}h wait"
                )
            elif random.random() < _SPIKE_CHANCE:
                avg_wait = port["baseline_wait"] * _SPIKE_MULTIPLIER
                logger.info(
                    f"⚠️  Port congestion spike: {port['name']} → {avg_wait:.1f}h wait"
                )

            berth_occupancy = min(port["baseline_occupancy"] * noise, 0.99)

            payload = {
                "port_code":           port["code"],
                "port_name":           port["name"],
                "avg_wait_hours":      round(avg_wait, 1),
                "berth_occupancy_pct": round(berth_occupancy * 100, 1),
                "vessels_at_anchor":   int(avg_wait / 3),
                "timestamp":           datetime.now(timezone.utc).isoformat(),
            }

            try:
                publish("ingestion.port-congestion", payload, source="port-mock")
                write_port_congestion(
                    port_code=port["code"],
                    port_name=port["name"],
                    avg_wait_hours=avg_wait,
                    berth_occupancy_pct=berth_occupancy * 100,
                )
            except Exception as e:
                logger.debug(f"Port congestion publish error: {e}")

        _first_poll = False  # subsequent polls use random spike chance
        await asyncio.sleep(60)
