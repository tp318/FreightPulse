"""
Kafka producer singleton — wraps confluent_kafka.Producer.
Publishes JSON-serialized messages to any topic.
"""
import json
import logging
from datetime import datetime, timezone
from typing import Any, Optional

logger = logging.getLogger(__name__)

_producer = None


def _get_producer():
    global _producer
    if _producer is None:
        try:
            from confluent_kafka import Producer
            from core.config import settings

            _producer = Producer(
                {
                    "bootstrap.servers": settings.kafka_brokers,
                    "client.id": "freightpulse-backend",
                    "acks": "all",
                    "retries": 3,
                    "retry.backoff.ms": 500,
                }
            )
            logger.info(f"Kafka producer connected to {settings.kafka_brokers}")
        except ImportError:
            logger.warning("confluent-kafka not installed; Kafka publishing disabled.")
        except Exception as e:
            logger.warning(f"Kafka producer init failed: {e}; publishing disabled.")
    return _producer


def _delivery_report(err, msg):
    if err is not None:
        logger.error(f"Kafka delivery failed [{msg.topic()}]: {err}")
    else:
        logger.debug(f"Kafka delivered → {msg.topic()} [partition {msg.partition()}]")


def publish(topic: str, payload: Any, source: Optional[str] = None):
    """
    Publish a message to a Kafka topic.
    Wraps payload in the standard FreightPulse envelope:
      { source, timestamp, payload }
    """
    producer = _get_producer()
    if producer is None:
        logger.debug(f"Kafka disabled — skipping publish to {topic}")
        return

    envelope = {
        "source": source or "system",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "payload": payload,
    }
    try:
        producer.produce(
            topic=topic,
            value=json.dumps(envelope).encode("utf-8"),
            callback=_delivery_report,
        )
        producer.poll(0)  # trigger delivery callbacks without blocking
    except Exception as e:
        logger.error(f"Failed to publish to {topic}: {e}")


def flush():
    """Flush pending messages — call before shutdown."""
    producer = _get_producer()
    if producer:
        producer.flush(timeout=5)
