import React, { useState, useMemo } from 'react';

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

  const whiskerMin = sorted.find((v) => v >= lowerThreshold) ?? sorted[0];
  const whiskerMax = [...sorted].reverse().find((v) => v <= upperThreshold) ?? sorted[sorted.length - 1];

  return { q1, median, q3, whiskerMin, whiskerMax };
}

// Simple deterministic hash so points don't jump around on re-renders
function pseudoRandom(seed) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

function kernelDensityEstimator(kernel, X) {
  return function (V) {
    return X.map((x) => [
      x,
      (1 / V.length) * V.reduce((acc, v) => acc + kernel(x - v), 0),
    ]);
  };
}

function gaussian(bandwidth) {
  const c = 1 / (bandwidth * Math.sqrt(2 * Math.PI));
  return function (u) {
    const z = u / bandwidth;
    return c * Math.exp(-0.5 * z * z);
  };
}

function standardDeviation(arr) {
  if (arr.length <= 1) return 0;
  const mean = arr.reduce((sum, v) => sum + v, 0) / arr.length;
  const variance = arr.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (arr.length - 1);
  return Math.sqrt(variance);
}

function silvermanBandwidth(data, stats) {
  const n = data.length;
  if (n <= 1) return 0.1;

  const sd = standardDeviation(data);
  const iqr = stats ? (stats.q3 - stats.q1) : 0;
  
  // Use IQR/1.34 if valid; fall back to standard deviation
  const spread = (iqr > 0 && sd > 0) 
    ? Math.min(sd, iqr / 1.34) 
    : (sd || 0.1);

  // Fallback if data points have near-zero variance
  const bw = 0.9 * spread * Math.pow(n, -0.2);
  return Math.max(bw, 0.01);
}

export default function PopulationChart({ results }) {
  const [selectedDay, setSelectedDay] = useState(7);
  const dt = results?.dt ?? results?.inputParams?.dt ?? 0.1;

  // Layout Dimensions
  // Map each patient's trajectory to the value at selectedDay
  const controlData = useMemo(() => {
    const stepIdx = Math.round(selectedDay / dt);
    return (results?.control || []).map(traj => 
      Array.isArray(traj) ? (traj[stepIdx] ?? traj[traj.length - 1]) : traj
    );
  }, [results?.control, selectedDay, dt]);

  const treatedData = useMemo(() => {
    const stepIdx = Math.round(selectedDay / dt);
    return (results?.treated || []).map(traj => 
      Array.isArray(traj) ? (traj[stepIdx] ?? traj[traj.length - 1]) : traj
    );
  }, [results?.treated, selectedDay, dt]);

  const controlStats = useMemo(() => calculateBoxPlotStats(controlData), [controlData]);
  const treatedStats = useMemo(() => calculateBoxPlotStats(treatedData), [treatedData]);

  if (controlData.length === 0 || treatedData.length === 0) {
    return(
      <div style={{ marginTop: '1.5rem' }}>
        <h3>Results</h3>
          <div
            style={{
              background: '#f4f4f4',
              padding: '1.5rem',
              textAlign: 'center',
              color: '#666',
              borderRadius: '4px'
            }}
          >
            No simulation run yet.
          </div>
      </div>
    )
  }

  const width = 800;
  const height = 380;
  const margin = { top: 75, right: 80, bottom: 60, left: 90 };
  const plotWidth = width - margin.left - margin.right;

  // Dynamix Y-Axis Bounds
  const allVals = [...controlData, ...treatedData];
  const dataMin = allVals.length ? Math.min(...allVals) : 2.5;
  const dataMax = allVals.length ? Math.max(...allVals) : 4.5;

  const yMin = Math.floor(dataMin * 2) / 2;
  const yMax = Math.max(Math.ceil(dataMax * 2) / 2, yMin + 0.5);

  const scaleY = (val) => {
    return height - margin.bottom - ((val - yMin) / (yMax - yMin)) * (height - margin.top - margin.bottom);
  };

  // KDE Computation
  const sampleCount = 120;
  const generateSteps = (min, max) => {
    const step = (max - min) / sampleCount;
    return Array.from({ length: sampleCount + 1 }, (_, i) => min + i * step);
  };

    // Calculate dynamic bandwidth for Control
  const bwCtrl = silvermanBandwidth(controlData, controlStats);
  const padCtrl = bwCtrl * 3.5; // Pad 3.5 bandwidths so tails taper to 0
  const minCtrl = Math.min(...controlData) - padCtrl;
  const maxCtrl = Math.max(...controlData) + padCtrl;

  const kdeCtrl = kernelDensityEstimator(
    gaussian(bwCtrl),
    generateSteps(minCtrl, maxCtrl)
  )(controlData);

  // Calculate dynamic bandwidth for Treatment
  const bwTrt = silvermanBandwidth(treatedData, treatedStats);
  const padTrt = bwTrt * 3.5;
  const minTrt = Math.min(...treatedData) - padTrt;
  const maxTrt = Math.max(...treatedData) + padTrt;

  const kdeTrt = kernelDensityEstimator(
    gaussian(bwTrt),
    generateSteps(minTrt, maxTrt)
  )(treatedData);

  const maxDensity = Math.max(
    ...kdeCtrl.map((d) => d[1]),
    ...kdeTrt.map((d) => d[1])
  );

  const maxViolinWidth = 75;

  const makeViolinPath = (kdeData, centerX) => {
    if (!kdeData.length) return '';
    const points = kdeData.map(([yVal, density]) => {
      const pxOffset = (density / maxDensity) * maxViolinWidth;
      return `${centerX + pxOffset},${scaleY(yVal)}`;
    });

    const topY = scaleY(kdeData[kdeData.length - 1][0]);
    const bottomY = scaleY(kdeData[0][0]);

    return `M ${centerX},${bottomY} L ${points.join(' L ')} L ${centerX},${topY} Z`;
  };

  const renderGroup = (data, stats, kdeData, centerX, violinColor, boxFillColor, label) => {
    if (!stats) return null;

    const boxWidth = 24;
    const yTop = scaleY(stats.q3);
    const yBottom = scaleY(stats.q1);
    const yMed = scaleY(stats.median);
    const yWhiskerMax = scaleY(stats.whiskerMax);
    const yWhiskerMin = scaleY(stats.whiskerMin);

    return (
      <g>
        {/* Half-Violin */}
        <path
          d={makeViolinPath(kdeData, centerX)}
          fill={violinColor}
          stroke="none"
          opacity={0.85}
        />

        {/* Jittered Scatter Points (positioned left of the box) */}
        {data.map((val, idx) => {
          // Jitter spread between -35px and -8px left of centerX
          const jitterX = centerX - 18 - pseudoRandom(idx * 7.91) * 24;
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
          x={centerX}
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
    <div>
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
          fontSize="14"
          fontWeight="bold"
          fill="#111"
        >
          log₁₀ Viral Load
        </text>

        {/* X-Axis Title */}
        <text
          x={margin.left + (width - margin.left - margin.right) / 2}
          y={height - 12}
          textAnchor="middle"
          fontSize="14"
          fontWeight="bold"
          fill="#111"
        >
          Intervention Group
        </text>

        {/* Data Groups */}
        {renderGroup(controlData, controlStats, kdeCtrl, 
          margin.left + plotWidth * 0.25, '#0E7382', '#0E7382', 'Control')}
        {renderGroup(treatedData, treatedStats, kdeTrt, margin.left + plotWidth * 0.75
          , '#86CCD5', '#86CCD5', 'Treatment')}
      </svg>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#555' }}>
        <span>Day: <strong>{selectedDay}</strong></span>
        <span>Day 30</span>
      </div>
      <input
        type="range"
        min="0"
        max="30"
        step="1"
        value={selectedDay}
        onChange={(e) => setSelectedDay(Number(e.target.value))}
        style={{ width: '100%', cursor: 'pointer' }}
      />
    </div>
   </div>
  );
}