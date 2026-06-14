/** LLM Reasoning card — streaming typewriter display of LLM decision + rationale */
import { useEffect, useRef, useState } from 'react';

const DECISION_STYLES = {
  reroute:         { bg: 'rgba(29,158,117,0.12)', border: 'rgba(29,158,117,0.4)', text: 'var(--accent-green)', icon: '🔀' },
  hold:            { bg: 'rgba(184,138,26,0.12)', border: 'rgba(184,138,26,0.4)', text: 'var(--status-watch)',  icon: '⏸' },
  expedite:        { bg: 'rgba(58,126,212,0.12)', border: 'rgba(58,126,212,0.4)', text: '#3A7ED4',              icon: '⚡' },
  'split-shipment':{ bg: 'rgba(122,93,212,0.12)', border: 'rgba(122,93,212,0.4)', text: '#7A5DD4',              icon: '✂️' },
};

export default function LLMReasoningCard({ data, streamChunk, isStreaming }) {
  const [displayedText, setDisplayedText] = useState('');
  const textRef = useRef('');
  const containerRef = useRef(null);

  // Accumulate streaming chunks
  useEffect(() => {
    if (streamChunk) {
      textRef.current += streamChunk;
      setDisplayedText(textRef.current);
    }
  }, [streamChunk]);

  // When complete data arrives, show the final rationale
  useEffect(() => {
    if (data?.rationale) {
      setDisplayedText(data.rationale);
    }
  }, [data?.rationale]);

  // Auto-scroll to bottom while streaming
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [displayedText]);

  const decision = data?.decision;
  const dStyle = DECISION_STYLES[decision] || DECISION_STYLES.hold;
  const callScript = data?.call_script;

  return (
    <div>
      {/* Decision badge */}
      {decision && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '5px 14px',
            borderRadius: '20px',
            background: dStyle.bg,
            border: `1px solid ${dStyle.border}`,
            marginBottom: '12px',
            animation: 'stage-enter 0.3s ease',
          }}
        >
          <span style={{ fontSize: '16px' }}>{dStyle.icon}</span>
          <span
            style={{
              fontSize: '13px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: dStyle.text,
            }}
          >
            {decision.replace('-', ' ')}
          </span>
        </div>
      )}

      {/* Streaming rationale */}
      {(displayedText || isStreaming) && (
        <div
          ref={containerRef}
          style={{
            padding: '10px',
            background: 'var(--bg-base)',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            maxHeight: '120px',
            overflowY: 'auto',
            marginBottom: '10px',
            fontSize: '12px',
            lineHeight: 1.6,
            color: 'var(--text-secondary)',
          }}
        >
          {displayedText}
          {isStreaming && (
            <span
              style={{
                display: 'inline-block',
                width: '2px',
                height: '14px',
                background: 'var(--accent-green)',
                marginLeft: '2px',
                verticalAlign: 'text-bottom',
                animation: 'typewriter-cursor 0.8s step-end infinite',
              }}
            />
          )}
        </div>
      )}

      {/* Call script */}
      {callScript && (
        <div
          style={{
            padding: '10px',
            background: 'rgba(29,158,117,0.06)',
            borderRadius: '6px',
            border: '1px solid rgba(29,158,117,0.2)',
            animation: 'stage-enter 0.3s ease',
          }}
        >
          <div
            style={{
              fontSize: '9px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--accent-green)',
              marginBottom: '6px',
            }}
          >
            📞 Generated Call Script
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
              lineHeight: 1.6,
            }}
          >
            {callScript}
          </p>
        </div>
      )}
    </div>
  );
}
