/** BriefPanel — AI-generated forwarder brief display with copy and download actions */
// TODO (Person 3): Integrate brief generation logic here if needed
import { useState, useCallback } from 'react';

export default function BriefPanel({ brief, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!brief) return;
    try {
      await navigator.clipboard.writeText(brief);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const ta = document.createElement('textarea');
      ta.value = brief;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [brief]);

  const handleDownload = useCallback(() => {
    if (!brief) return;
    const blob = new Blob([brief], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `freightpulse-brief-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [brief]);

  if (!brief) return null;

  // Parse brief text: lines starting with ** are section headers
  const renderBrief = (text) => {
    const lines = text.split('\n');
    const elements = [];

    lines.forEach((line, i) => {
      const trimmed = line.trim();

      // Section header: **HEADER:**
      const headerMatch = trimmed.match(/^\*\*(.+?)\*\*:?$/);
      if (headerMatch) {
        elements.push(
          <h4
            key={i}
            className="text-xs font-medium"
            style={{
              color: 'var(--accent-green)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginTop: i > 0 ? '16px' : '0',
              marginBottom: '6px',
              fontFamily: 'var(--font-mono)',
            }}
          >
            {headerMatch[1]}
          </h4>
        );
        return;
      }

      // Bullet point
      if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        elements.push(
          <p
            key={i}
            className="text-sm"
            style={{
              color: 'var(--text-secondary)',
              margin: '2px 0',
              paddingLeft: trimmed.startsWith('  ') ? '20px' : '8px',
              lineHeight: '1.6',
            }}
          >
            {trimmed}
          </p>
        );
        return;
      }

      // Numbered list
      if (/^\d+\./.test(trimmed)) {
        elements.push(
          <p
            key={i}
            className="text-sm"
            style={{
              color: 'var(--text-secondary)',
              margin: '2px 0',
              paddingLeft: '8px',
              lineHeight: '1.6',
            }}
          >
            {trimmed}
          </p>
        );
        return;
      }

      // Empty line
      if (!trimmed) {
        elements.push(<div key={i} style={{ height: '6px' }} />);
        return;
      }

      // Regular text (check for inline bold **)
      const parts = trimmed.split(/(\*\*.+?\*\*)/g);
      elements.push(
        <p
          key={i}
          className="text-sm"
          style={{
            color: 'var(--text-secondary)',
            margin: '2px 0',
            lineHeight: '1.6',
          }}
        >
          {parts.map((part, j) => {
            const boldMatch = part.match(/^\*\*(.+?)\*\*$/);
            if (boldMatch) {
              return (
                <strong key={j} style={{ color: 'var(--text-primary)' }}>
                  {boldMatch[1]}
                </strong>
              );
            }
            return <span key={j}>{part}</span>;
          })}
        </p>
      );
    });

    return elements;
  };

  const now = new Date();
  const timestamp = `${now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <div
      className="w-full mt-4 rounded-lg"
      style={{
        background: '#1A1E28',
        border: '1px solid var(--border)',
        boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
        animation: 'slideDown 0.35s ease-out',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2">
          <span style={{ fontSize: '16px' }}>📋</span>
          <h3
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)', margin: 0 }}
          >
            Forwarder Brief
          </h3>
          <span
            className="text-xs font-mono"
            style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}
          >
            Generated {timestamp}
          </span>
        </div>
        <button
          onClick={onClose}
          className="flex items-center justify-center rounded"
          style={{
            width: '28px',
            height: '28px',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '16px',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="px-5 py-4" style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {renderBrief(brief)}
      </div>

      {/* Footer actions */}
      <div
        className="flex items-center gap-3 px-5 py-3"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <button
          onClick={handleCopy}
          className="text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1.5"
          style={{
            background: copied ? 'var(--accent-green-dim)' : 'var(--bg-elevated)',
            border: `1px solid ${copied ? 'var(--accent-green)' : 'var(--border)'}`,
            color: copied ? 'var(--accent-green)' : 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          {copied ? '✓ Copied!' : '📋 Copy to clipboard'}
        </button>
        <button
          onClick={handleDownload}
          className="text-xs font-medium px-3 py-1.5 rounded flex items-center gap-1.5"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
        >
          ⬇ Download .txt
        </button>
      </div>
    </div>
  );
}
