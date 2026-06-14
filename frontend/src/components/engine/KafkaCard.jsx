/** Kafka card — animated message flow visualization */
import { useEffect, useState } from 'react';

const TOPICS = [
  { id: 'ingestion.news',           color: 'var(--signal-gdelt)',       label: 'ingestion.news' },
  { id: 'ingestion.weather',        color: 'var(--signal-weather)',     label: 'ingestion.weather' },
  { id: 'ingestion.ais',            color: 'var(--signal-ais)',         label: 'ingestion.ais' },
  { id: 'ingestion.port-congestion',color: 'var(--signal-congestion)',  label: 'ingestion.port-congestion' },
  { id: 'disruption.detected',      color: 'var(--status-critical)',    label: 'disruption.detected' },
  { id: 'engine.stage-updates',     color: 'var(--accent-green)',       label: 'engine.stage-updates' },
];

function AnimatedParticle({ color, delay }) {
  return (
    <div
      style={{
        position: 'absolute',
        top: '50%',
        left: 0,
        width: '8px',
        height: '4px',
        borderRadius: '2px',
        background: color,
        transform: 'translateY(-50%)',
        animation: `particle-flow 1.8s ${delay}s ease-in-out infinite`,
      }}
    />
  );
}

export default function KafkaCard({ data }) {
  const [activeTopic, setActiveTopic] = useState(null);
  const [msgCounts, setMsgCounts] = useState({});

  useEffect(() => {
    if (!data) return;
    const topics = data.topics_active || [];
    const counts = {};
    topics.forEach((t) => (counts[t] = (counts[t] || 0) + 1));
    setMsgCounts(counts);

    // Cycle through active topics visually
    let idx = 0;
    const interval = setInterval(() => {
      setActiveTopic(topics[idx % topics.length]);
      idx++;
    }, 600);
    return () => clearInterval(interval);
  }, [data]);

  return (
    <div>
      {/* Topic pills with message flow */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {TOPICS.map((topic) => {
          const isActive = data?.topics_active?.includes(topic.id) || false;
          return (
            <div
              key={topic.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '5px 10px',
                borderRadius: '5px',
                background: isActive ? 'var(--bg-elevated)' : 'transparent',
                border: isActive
                  ? `1px solid ${topic.color}44`
                  : '1px solid var(--border)',
                opacity: isActive ? 1 : 0.45,
                transition: 'all 0.3s ease',
              }}
            >
              {/* Topic dot */}
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: topic.color,
                  flexShrink: 0,
                  opacity: isActive ? 1 : 0.4,
                  boxShadow: isActive ? `0 0 6px ${topic.color}88` : 'none',
                  transition: 'all 0.3s ease',
                }}
              />
              {/* Topic name */}
              <span
                style={{
                  flex: 1,
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  color: isActive ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                }}
              >
                {topic.label}
              </span>

              {/* Animated particle track */}
              {isActive && (
                <div
                  style={{
                    position: 'relative',
                    width: '60px',
                    height: '8px',
                    overflow: 'hidden',
                    borderRadius: '4px',
                    background: 'var(--bg-base)',
                  }}
                >
                  <AnimatedParticle color={topic.color} delay={0} />
                  <AnimatedParticle color={topic.color} delay={0.6} />
                  <AnimatedParticle color={topic.color} delay={1.2} />
                </div>
              )}

              {/* Message count */}
              <span
                style={{
                  fontSize: '10px',
                  fontFamily: 'var(--font-mono)',
                  color: isActive ? topic.color : 'var(--text-tertiary)',
                  minWidth: '20px',
                  textAlign: 'right',
                }}
              >
                {isActive ? '●' : '○'}
              </span>
            </div>
          );
        })}
      </div>

      {data?.messages && (
        <div
          style={{
            marginTop: '8px',
            fontSize: '10px',
            color: 'var(--text-tertiary)',
            fontFamily: 'var(--font-mono)',
          }}
        >
          {data.messages} message{data.messages !== 1 ? 's' : ''} flowing → topic: <span style={{ color: 'var(--accent-green)' }}>{data.topic || 'ingestion.news'}</span>
        </div>
      )}
    </div>
  );
}
