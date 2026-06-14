"""
Kafka consumer helpers — thin wrapper around confluent_kafka.Consumer.
Each consumer runs in an asyncio thread executor so it doesn't block the event loop.
"""
import asyncio
import json
import logging
import threading
from typing import Callable, List

logger = logging.getLogger(__name__)


class KafkaConsumerThread(threading.Thread):
    """
    Background thread that polls a Kafka topic and calls `handler(envelope)` for each message.
    envelope = { "source": ..., "timestamp": ..., "payload": { ... } }
    """

    def __init__(
        self,
        topics: List[str],
        group_id: str,
        handler: Callable[[dict], None],
        brokers: str = "localhost:19092",
    ):
        super().__init__(daemon=True)
        self.topics = topics
        self.group_id = group_id
        self.handler = handler
        self.brokers = brokers
        self._stop_event = threading.Event()

    def stop(self):
        self._stop_event.set()

    def run(self):
        if self.brokers.lower() == "none":
            logger.info(f"[{self.group_id}] KAFKA_BROKERS='none' — consumer disabled.")
            return

        try:
            from confluent_kafka import Consumer, KafkaException
        except ImportError:
            logger.warning("confluent-kafka not installed; consumer disabled.")
            return

        consumer = Consumer(
            {
                "bootstrap.servers": self.brokers,
                "group.id": self.group_id,
                "auto.offset.reset": "latest",
                "enable.auto.commit": True,
            }
        )
        consumer.subscribe(self.topics)
        logger.info(f"[{self.group_id}] Subscribed to {self.topics}")

        try:
            while not self._stop_event.is_set():
                msg = consumer.poll(timeout=1.0)
                if msg is None:
                    continue
                if msg.error():
                    logger.error(f"Consumer error: {msg.error()}")
                    continue
                try:
                    envelope = json.loads(msg.value().decode("utf-8"))
                    self.handler(envelope)
                except Exception as e:
                    logger.error(f"Handler error for msg on {msg.topic()}: {e}")
        finally:
            consumer.close()
            logger.info(f"[{self.group_id}] Consumer closed.")


def start_consumer(
    topics: List[str],
    group_id: str,
    handler: Callable[[dict], None],
    brokers: str = "localhost:19092",
) -> KafkaConsumerThread:
    """Start a background consumer thread and return it."""
    t = KafkaConsumerThread(topics, group_id, handler, brokers)
    t.start()
    return t
