/** CSVUpload — Drag-and-drop CSV upload zone for importing shipment data */
import { useState, useRef, useCallback } from 'react';
import Papa from 'papaparse';
import { uploadShipments } from '../api/client.js';

export default function CSVUpload({ onUpload }) {
  const [state, setState] = useState('idle'); // idle | dragging | parsing | success | error
  const [fileName, setFileName] = useState('');
  const [rowCount, setRowCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const inputRef = useRef(null);

  const handleFile = useCallback((file) => {
    if (!file || !file.name.endsWith('.csv')) {
      setState('error');
      setErrorMsg('Please upload a .csv file');
      return;
    }

    setState('parsing');
    setFileName(file.name);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        if (results.errors && results.errors.length > 0) {
          setState('error');
          setErrorMsg(results.errors[0].message);
          return;
        }

        const data = results.data;
        setRowCount(data.length);
        setState('success');

        // Send to backend (silently catch errors)
        try {
          await uploadShipments(data);
        } catch {
          // silent — mock mode handles this
        }

        onUpload(data);
      },
      error: (err) => {
        setState('error');
        setErrorMsg(err.message);
      },
    });
  }, [onUpload]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setState('idle');
    const file = e.dataTransfer?.files?.[0];
    handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setState('dragging');
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setState('idle');
  }, []);

  const handleInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    handleFile(file);
  }, [handleFile]);

  const handleBrowseClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  return (
    <div
      className="flex items-center justify-center w-full"
      style={{ minHeight: '320px', padding: '32px' }}
    >
      <div
        className="flex flex-col items-center justify-center w-full rounded-lg"
        style={{
          maxWidth: '560px',
          padding: '48px 32px',
          background: state === 'dragging' ? 'rgba(13, 84, 64, 0.15)' : 'var(--bg-surface)',
          border: `2px dashed ${state === 'dragging' ? 'var(--accent-green)' : 'var(--border-accent)'}`,
          transition: 'all 0.2s ease',
          cursor: 'pointer',
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleBrowseClick}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          onChange={handleInputChange}
          style={{ display: 'none' }}
        />

        {state === 'idle' || state === 'dragging' ? (
          <>
            {/* Upload icon */}
            <svg
              width="48" height="48" viewBox="0 0 48 48" fill="none"
              style={{ marginBottom: '16px', opacity: 0.6 }}
            >
              <path
                d="M24 32V12M24 12L16 20M24 12L32 20"
                stroke="var(--text-secondary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 32V38C8 39.1 8.9 40 10 40H38C39.1 40 40 39.1 40 38V32"
                stroke="var(--text-secondary)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)', marginBottom: '8px' }}
            >
              {state === 'dragging' ? 'Drop your CSV here' : 'Drag & drop your shipment CSV'}
            </p>
            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
              or{' '}
              <span
                style={{ color: 'var(--accent-green)', textDecoration: 'underline', cursor: 'pointer' }}
              >
                browse files
              </span>
            </p>
            <p
              className="text-xs"
              style={{ color: 'var(--text-tertiary)', marginTop: '16px' }}
            >
              Accepts .csv with columns: id, origin, destination, vessel, eta, cargoValue
            </p>
            <p
              className="text-xs"
              style={{ color: 'var(--text-tertiary)', marginTop: '8px' }}
            >
              Need a test file? <a href="https://drive.google.com/file/d/1OaFJhzISPzXvuLu2RpA_rhb0vLupMPT7/view?usp=sharing" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-green)', textDecoration: 'underline' }}>Download mock CSV</a>
            </p>
          </>
        ) : null}

        {state === 'parsing' && (
          <div className="flex flex-col items-center gap-3">
            <div
              className="rounded-full"
              style={{
                width: '32px',
                height: '32px',
                border: '3px solid var(--border-accent)',
                borderTopColor: 'var(--accent-green)',
                animation: 'spin 0.8s linear infinite',
              }}
            />
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Parsing {fileName}…
            </p>
          </div>
        )}

        {state === 'success' && (
          <div className="flex flex-col items-center gap-2">
            <span style={{ fontSize: '28px' }}>✓</span>
            <p className="text-sm font-medium" style={{ color: 'var(--accent-green)' }}>
              {rowCount} shipments loaded
            </p>
            <p className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
              {fileName}
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="flex flex-col items-center gap-2">
            <span style={{ fontSize: '28px' }}>✕</span>
            <p className="text-sm" style={{ color: 'var(--status-critical)' }}>
              {errorMsg}
            </p>
            <button
              className="text-xs px-3 py-1 rounded"
              style={{
                marginTop: '8px',
                color: 'var(--text-secondary)',
                background: 'var(--bg-elevated)',
                border: '1px solid var(--border)',
              }}
              onClick={(e) => {
                e.stopPropagation();
                setState('idle');
                setErrorMsg('');
              }}
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Spinner keyframe (inline for self-containment) */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
