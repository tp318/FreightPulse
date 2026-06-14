/** Calling Agent card — animated phone call status progression */
const CALL_STATES = ['idle', 'dialing', 'ringing', 'connected', 'complete'];

const STATE_ICONS = {
  idle:      '📵',
  dialing:   '📲',
  ringing:   '📳',
  connected: '📞',
  complete:  '✅',
};

const STATE_LABELS = {
  idle:      'Waiting',
  dialing:   'Dialing…',
  ringing:   'Ringing…',
  connected: 'Connected',
  complete:  'Call Complete',
};

function CallStatusDot({ active, complete, color }) {
  return (
    <div
      style={{
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        background: complete ? 'var(--accent-green)' : active ? color : 'var(--border-accent)',
        boxShadow: active ? `0 0 8px ${color}88` : 'none',
        transition: 'all 0.4s ease',
        animation: active ? 'pulse-dot 1.5s ease-in-out infinite' : 'none',
      }}
    />
  );
}

export default function CallingAgentCard({ data }) {
  // Derive current call state from data
  let callState = 'idle';
  if (data) {
    const status = data.status || '';
    if (status === 'queued' || status === 'initiated') callState = 'dialing';
    else if (status === 'ringing') callState = 'ringing';
    else if (status === 'in-progress') callState = 'connected';
    else if (status === 'completed' || status === 'complete' || data.call_sid) callState = 'complete';
    else if (data.call_sid === 'DEMO-NO-CREDENTIALS') callState = 'complete';
  }

  const stateIdx = CALL_STATES.indexOf(callState);

  return (
    <div>
      {/* Phone icon with animation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '14px',
        }}
      >
        <div
          style={{
            fontSize: '32px',
            animation: callState === 'ringing' ? 'call-ring 0.8s ease-in-out 3' :
                       callState === 'dialing' ? 'call-ring 1.2s ease-in-out infinite' : 'none',
          }}
        >
          {STATE_ICONS[callState]}
        </div>
        <div>
          <div
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: callState === 'complete' ? 'var(--accent-green)' : 'var(--text-primary)',
            }}
          >
            {STATE_LABELS[callState]}
          </div>
          {data?.to && (
            <div
              style={{
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              → {data.to}
            </div>
          )}
        </div>
      </div>

      {/* Progress dots */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        {CALL_STATES.slice(1).map((state, i) => {
          const stateI = i + 1;
          const isComplete = stateIdx >= stateI;
          const isActive   = stateIdx === stateI;
          const color = isComplete ? 'var(--accent-green)' : 'var(--status-watch)';

          return (
            <div key={state} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <CallStatusDot active={isActive} complete={isComplete && !isActive} color={color} />
              <span
                style={{
                  fontSize: '10px',
                  color: isComplete ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {STATE_LABELS[state]}
              </span>
              {i < CALL_STATES.length - 2 && (
                <div
                  style={{
                    width: '20px',
                    height: '1px',
                    background: isComplete ? 'var(--accent-green)' : 'var(--border)',
                    transition: 'background 0.4s ease',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Call details */}
      {data?.call_sid && (
        <div
          style={{
            padding: '8px 10px',
            background: 'var(--bg-elevated)',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              fontSize: '9px',
              color: 'var(--text-tertiary)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '3px',
            }}
          >
            Call SID
          </div>
          <div
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-secondary)',
              wordBreak: 'break-all',
            }}
          >
            {data.call_sid}
          </div>
        </div>
      )}

      {/* Skip/reason notice */}
      {data?.reason && (
        <div
          style={{
            fontSize: '10px',
            color: 'var(--status-watch)',
            padding: '6px 10px',
            borderRadius: '4px',
            background: 'rgba(184,138,26,0.08)',
            border: '1px solid rgba(184,138,26,0.2)',
          }}
        >
          ℹ️ {data.reason}
        </div>
      )}

      {/* Call script being read */}
      {data?.call_script && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px 10px',
            background: 'rgba(29,158,117,0.06)',
            borderRadius: '6px',
            border: '1px solid rgba(29,158,117,0.2)',
          }}
        >
          <div
            style={{
              fontSize: '9px',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              color: 'var(--accent-green)',
              marginBottom: '5px',
            }}
          >
            📢 Script Being Read
          </div>
          <p
            style={{
              margin: 0,
              fontSize: '11px',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              fontStyle: 'italic',
            }}
          >
            "{data.call_script}"
          </p>
        </div>
      )}
    </div>
  );
}
