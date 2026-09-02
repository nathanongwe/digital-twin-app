import React, { useMemo } from 'react';

// Standard IQR Box Plot calculation with Tukey outlier detection
function calculateBoxPlotStats(data) {
  if (!data || data.length === 0) return null;
  const sorted = [...data].sort((a, b) => a - b);

  const getPercentile = (p) => {
    const idx = (sorted.length - 1) * p;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  const q1 = getPercentile(0.25);
  const median = getPercentile(0.50);
  const q3 = getPercentile(0.75);
  const iqr = q3 - q1;

  // Whisker limits (1.5 * IQR)
  const lowerThreshold = q1 - 1.5 * iqr;
  const upperThreshold = q3 + 1.5 * iqr;

  const validVals = sorted.filter((v) => v >= lowerThreshold && v <= upperThreshold);
  const whiskerMin = validVals.length > 0 ? validVals[0] : sorted[0];
  const whiskerMax = validVals.length > 0 ? validVals[validVals.length - 1] : sorted[sorted.length - 1];

  return { q1, median, q3, whiskerMin, whiskerMax };
}

// Simple deterministic hash so points don't jump around on re-renders
function pseudoRandom(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

export default function PopulationChart({ results }) {
  if (!results || (!results.control && !results.treated)) {
    return (
      <div style={{ height: '380px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>
        Run simulation to generate viral load comparison
      </div>
    );
  }

  const controlData = results.control || [];
  const treatedData = results.treated || [];

  const controlStats = useMemo(() => calculateBoxPlotStats(controlData), [controlData]);
  const treatedStats = useMemo(() => calculateBoxPlotStats(treatedData), [treatedData]);

  const width = 800;
  const height = 380;
  const margin = { top: 75, right: 80, bottom: 60, left: 90 };

  const allVals = [...controlData, ...treatedData];
  const dataMin = allVals.length ? Math.min(...allVals) : 2.5;
  const dataMax = allVals.length ? Math.max(...allVals) : 4.5;

  const yMin = Math.floor(dataMin * 2) / 2;
  const yMax = Math.ceil(dataMax * 2) / 2;

  const scaleY = (val) => {
    return height - margin.bottom - ((val - yMin) / (yMax - yMin)) * (height - margin.top - margin.bottom);
  };

  const renderGroup = (data, stats, centerX, boxFillColor, label) => {
    if (!stats) return null;

    const boxWidth = 28;
    const yTop = scaleY(stats.q3);
    const yBottom = scaleY(stats.q1);
    const yMed = scaleY(stats.median);
    const yWhiskerMax = scaleY(stats.whiskerMax);
    const yWhiskerMin = scaleY(stats.whiskerMin);

    return (
      <g>
        {/* Jittered Scatter Points (positioned left of the box) */}
        {data.map((val, idx) => {
          // Jitter spread between -35px and -8px left of centerX
          const jitterX = centerX - 8 - pseudoRandom(idx * 7.91) * 28;
          const cy = scaleY(val);
          return (
            <circle
              key={idx}
              cx={jitterX}
              cy={cy}
              r={3.2}
              fill="#2563eb"
              opacity={0.45}
            />
          );
        })}

        {/* Box Plot Whisker Lines */}
        <line x1={centerX} y1={yWhiskerMax} x2={centerX} y2={yTop} stroke="#111" strokeWidth="1.5" />
        <line x1={centerX} y1={yBottom} x2={centerX} y2={yWhiskerMin} stroke="#111" strokeWidth="1.5" />

        {/* Interquartile Box */}
        <rect
          x={centerX - boxWidth / 2}
          y={yTop}
          width={boxWidth}
          height={Math.max(yBottom - yTop, 1)}
          fill={boxFillColor}
          stroke="#111"
          strokeWidth="1.5"
        />

        {/* Median Line */}
        <line
          x1={centerX - boxWidth / 2}
          y1={yMed}
          x2={centerX + boxWidth / 2}
          y2={yMed}
          stroke="#111"
          strokeWidth="2.5"
        />

        {/* Group Label */}
        <text
          x={centerX - 10}
          y={height - margin.bottom + 25}
          textAnchor="middle"
          fontSize="13"
          fill="#333"
        >
          {label}
        </text>
      </g>
    );
  };

  // Generate tick steps of 0.5
  const ticks = [];
  for (let val = yMin; val <= yMax + 0.001; val += 0.5) {
    ticks.push(Number(val.toFixed(1)));
  }

  return (
    <div style={{ display: 'inline-block', fontFamily: 'sans-serif' }}>
      <svg width={width} height={height} style={{ background: '#fff' }}>
        {/* Horizontal Gridlines & Y-Axis Labels */}
        {ticks.map((val) => {
          const y = scaleY(val);
          return (
            <g key={val}>
              <line x1={margin.left} y1={y} x2={width - margin.right} y2={y} stroke="#eaeaea" strokeWidth="1" />
              <text x={margin.left - 12} y={y + 4} textAnchor="end" fontSize="11" fill="#777">
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {/* Y-Axis Title */}
        <text
          x={-(margin.top + (height - margin.top - margin.bottom) / 2)}
          y={20}
          transform="rotate(-90)"
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          fill="#111"
        >
          log₁₀ Viral Load
        </text>

        {/* X-Axis Title */}
        <text
          x={margin.left + (width - margin.left - margin.right) / 2}
          y={height - 12}
          textAnchor="middle"
          fontSize="13"
          fontWeight="600"
          fill="#111"
        >
          Intervention Group
        </text>

        {/* Data Groups */}
        {renderGroup(controlData, controlStats, 175, 'rgba(255, 255, 255, 0.9)', 'Control')}
        {renderGroup(treatedData, treatedStats, 345, 'rgba(255, 255, 255, 0.9)', 'Treatment')}
      </svg>
    </div>
  );
}