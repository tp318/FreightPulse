"""
TimescaleDB client — uses psycopg2 (sync) to write time-series data.
Tables are auto-created on first connection.
"""
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

_conn = None
_timescale_failed = False


def _get_conn():
    global _conn, _timescale_failed
    if _timescale_failed:
        return None
    if _conn is None or _conn.closed:
        try:
            import psycopg2
            from core.config import settings

            _conn = psycopg2.connect(settings.timescale_database_url)
            _conn.autocommit = True
            _init_schema(_conn)
            logger.info("TimescaleDB connected and schema initialised.")
        except ImportError:
            logger.warning("psycopg2 not installed; TimescaleDB disabled.")
            _timescale_failed = True
        except Exception as e:
            logger.warning(f"TimescaleDB connection failed: {e}. Disabling TimescaleDB.")
            _timescale_failed = True
    return _conn


def _init_schema(conn):
    """Create hypertables if they don't exist."""
    ddl = """
    CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

    CREATE TABLE IF NOT EXISTS ais_positions (
        time            TIMESTAMPTZ NOT NULL,
        vessel_imo      TEXT        NOT NULL,
        vessel_name     TEXT,
        lat             DOUBLE PRECISION,
        lon             DOUBLE PRECISION,
        speed           DOUBLE PRECISION,
        heading         DOUBLE PRECISION
    );

    CREATE TABLE IF NOT EXISTS port_congestion_metrics (
        time                TIMESTAMPTZ NOT NULL,
        port_code           TEXT        NOT NULL,
        port_name           TEXT,
        avg_wait_hours      DOUBLE PRECISION,
        berth_occupancy_pct DOUBLE PRECISION
    );

    CREATE TABLE IF NOT EXISTS weather_observations (
        time            TIMESTAMPTZ NOT NULL,
        region          TEXT        NOT NULL,
        wind_speed      DOUBLE PRECISION,
        wave_height     DOUBLE PRECISION,
        temperature     DOUBLE PRECISION
    );
    """
    # Create hypertables (idempotent via IF NOT EXISTS + error suppression)
    hypertables = [
        "SELECT create_hypertable('ais_positions','time', if_not_exists => TRUE);",
        "SELECT create_hypertable('port_congestion_metrics','time', if_not_exists => TRUE);",
        "SELECT create_hypertable('weather_observations','time', if_not_exists => TRUE);",
    ]
    with conn.cursor() as cur:
        cur.execute(ddl)
        for ht in hypertables:
            try:
                cur.execute(ht)
            except Exception as e:
                # Already a hypertable — safe to ignore
                logger.debug(f"Hypertable note: {e}")


def write_ais_position(
    vessel_imo: str,
    vessel_name: str,
    lat: float,
    lon: float,
    speed: float,
    heading: float,
):
    conn = _get_conn()
    if conn is None:
        return
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ais_positions (time, vessel_imo, vessel_name, lat, lon, speed, heading)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    datetime.now(timezone.utc),
                    vessel_imo,
                    vessel_name,
                    lat,
                    lon,
                    speed,
                    heading,
                ),
            )
    except Exception as e:
        logger.error(f"TimescaleDB AIS write failed: {e}")


def write_port_congestion(
    port_code: str,
    port_name: str,
    avg_wait_hours: float,
    berth_occupancy_pct: float,
):
    conn = _get_conn()
    if conn is None:
        return
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO port_congestion_metrics
                    (time, port_code, port_name, avg_wait_hours, berth_occupancy_pct)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    datetime.now(timezone.utc),
                    port_code,
                    port_name,
                    avg_wait_hours,
                    berth_occupancy_pct,
                ),
            )
    except Exception as e:
        logger.error(f"TimescaleDB port congestion write failed: {e}")


def write_weather_observation(
    region: str,
    wind_speed: float,
    wave_height: float,
    temperature: float,
):
    conn = _get_conn()
    if conn is None:
        return
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO weather_observations
                    (time, region, wind_speed, wave_height, temperature)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    datetime.now(timezone.utc),
                    region,
                    wind_speed,
                    wave_height,
                    temperature,
                ),
            )
    except Exception as e:
        logger.error(f"TimescaleDB weather write failed: {e}")
