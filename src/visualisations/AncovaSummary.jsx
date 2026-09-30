import React, { useMemo } from 'react';

const MUTED = '#6b7280';
const BORDER = '#e5e7eb';

function summarize(runs) {
  const all = runs || [];
  const valid = all.filter((r) => r && r.valid);
  const n = valid.length;
  if (n === 0) return null;

  const significant = valid.filter((r) => r.significant).length;

  return {
    n,
    total: all.length,
    significant,
    power: (significant / n) * 100,
  };
}

const cell = { padding: '6px 10px', borderBottom: `1px solid ${BORDER}` };
const headCell = { padding: '8px 10px', textAlign: 'left', fontSize: '0.75rem', color: MUTED, fontWeight: 600 };

function num(v, digits = 3) {
  return v == null || Number.isNaN(v) ? '—' : v.toFixed(digits);
}

export default function AncovaSummary({ runs }) {
  const stats = useMemo(() => summarize(runs), [runs]);

  if (!stats) {
    return (
      <div
        style={{
          padding: '1.5rem',
          textAlign: 'center',
          color: MUTED,
          background: '#f9fafb',
          border: `1px solid ${BORDER}`,
          borderRadius: '6px',
        }}
      >
        Run a simulation to view the analysis.
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: 'block',
          width: '100%',
          boxSizing: 'border-box',
          marginBottom: '1rem',
          padding: '0.75rem 0.9rem',
          border: `1px solid ${BORDER}`,
          borderRadius: '6px',
          background: '#fff',
        }}
      >
        <div style={{ fontSize: '0.72rem', color: MUTED, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
          Power
        </div>
        <div style={{ fontSize: '1.35rem', fontWeight: 600, color: '#111', marginTop: '0.15rem' }}>
          {stats.power.toFixed(1)}%
        </div>
        <div style={{ fontSize: '0.72rem', color: MUTED, marginTop: '0.15rem' }}>
          {stats.significant} / {stats.n} significant
        </div>
      </div>

      <div style={{ maxHeight: '360px', overflowY: 'auto', border: `1px solid ${BORDER}`, borderRadius: '6px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#f9fafb' }}>
            <tr>
              <th style={headCell}>Run</th>
              <th style={headCell}>Ctrl Mean</th>
              <th style={headCell}>Trt Mean</th>
              <th style={headCell}>Diff</th>
              <th style={headCell}>SE</th>
              <th style={headCell}>p-value</th>
              <th style={headCell}>Significant</th>
            </tr>
          </thead>
          <tbody>
            {(runs || []).map((r, idx) => {
              const invalid = !r || !r.valid;
              return (
                <tr key={idx} style={{ opacity: invalid ? 0.45 : 1 }}>
                  <td style={cell}>#{idx + 1}</td>
                  <td style={cell}>{invalid ? '—' : num(r.mean_control, 2)}</td>
                  <td style={cell}>{invalid ? '—' : num(r.mean_treatment, 2)}</td>
                  <td style={cell}>{invalid ? '—' : num(r.diff, 3)}</td>
                  <td style={cell}>{invalid ? '—' : num(r.se_diff, 3)}</td>
                  <td style={cell}>{invalid ? '—' : r.p_value < 0.001 ? '< 0.001' : r.p_value.toFixed(4)}</td>
                  <td style={{ ...cell, color: invalid ? MUTED : r.significant ? '#0f766e' : '#b91c1c', fontWeight: 600 }}>
                    {invalid ? '—' : r.significant ? 'Yes' : 'No'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
