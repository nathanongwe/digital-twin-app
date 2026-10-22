import React, { useEffect, useRef, useState, useMemo } from 'react';
import { AlertTriangle, MoveHorizontal } from 'lucide-react';
import {
  GammaParams,
  gammaPdf,
  gammaCdf,
  gammaQuantile,
  gammaP,
  fmt,
  niceCeil,
} from './gammaMath';

interface GammaChartProps {
  params: GammaParams;
  onCutoffDrag: (nextMax: number) => void;
  isOpen: boolean;
}

export function GammaChart({
  params,
  onCutoffDrag,
  isOpen,
}: GammaChartProps): React.JSX.Element {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [size, setSize] = useState({ width: 520, height: 260 });
  const [dragging, setDragging] = useState(false);
  const [hoverX, setHoverX] = useState<number | null>(null);

  const k = Math.max(0.1, params.shape);
  const r = Math.max(0.05, params.rate);
  const hasMax = params.hasMax;
  const mx = Math.max(0, params.max);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      const el = wrapRef.current;
      if (!el) return;
      const update = () => {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setSize({ width: rect.width, height: rect.height });
        }
      };
      update();
      const ro = new ResizeObserver(update);
      ro.observe(el);
      return () => ro.disconnect();
    }, 20);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const chart = useMemo(() => {
    const W = size.width;
    const H = size.height;
    const small = W < 400;
    const PL = small ? 36 : 44;
    const PR = 16;
    const PT = 22;
    const PB = 28;
    const iw = Math.max(10, W - PL - PR);
    const ih = Math.max(10, H - PT - PB);
    const base = PT + ih;

    const q995 = gammaQuantile(0.995, k, r);
    const xMax = Math.max(q995, hasMax ? mx * 1.08 : 0, 1);

    let yMax: number;
    if (k < 1) {
      yMax = gammaPdf(Math.max(gammaQuantile(0.06, k, r), xMax * 1e-4), k, r);
    } else if (k === 1) {
      yMax = r;
    } else {
      const mode = (k - 1) / r;
      yMax = gammaPdf(mode, k, r);
    }
    if (!Number.isFinite(yMax) || yMax <= 0) yMax = 1;
    yMax *= 1.12;

    const X = (v: number) => PL + (v / xMax) * iw;
    const Y = (v: number) => Math.max(PT - 50, PT + ih - (v / yMax) * ih);

    const N = Math.max(200, Math.min(520, Math.round(iw * 1.4)));
    const xs: number[] = [];
    const ys: number[] = [];
    for (let i = 0; i <= N; i++) {
      const x = (i / N) * xMax;
      xs.push(x);
      const y = gammaPdf(x, k, r);
      ys.push(Math.min(Number.isFinite(y) ? y : yMax * 3, yMax * 3));
    }

    const line = (a: number, b: number) => {
      let d = '';
      for (let i = a; i <= b; i++) {
        d += (i === a ? 'M' : 'L') + X(xs[i]).toFixed(2) + ' ' + Y(ys[i]).toFixed(2);
      }
      return d;
    };

    const effectiveMx = hasMax ? mx : xMax;
    const mxClamped = Math.min(effectiveMx, xMax);
    let si = 0;
    while (si < xs.length && xs[si] < mxClamped) si++;

    const rawYAtMax = gammaPdf(mxClamped, k, r);
    const yAtMax = Math.min(Number.isFinite(rawYAtMax) ? rawYAtMax : yMax * 3, yMax * 3);

    let areaIn = '';
    let areaOut = '';
    let curveIn = '';
    let curveOut = '';

    if (!hasMax) {
      curveIn = line(0, xs.length - 1);
      areaIn = `${curveIn}L${X(xMax).toFixed(2)} ${base}L${X(0).toFixed(2)} ${base}Z`;
    } else {
      if (mx > 0) {
        curveIn = line(0, Math.max(0, si - 1));
        if (si > 0) {
          curveIn += `L${X(mxClamped).toFixed(2)} ${Y(yAtMax).toFixed(2)}`;
        } else {
          curveIn = `M${X(0).toFixed(2)} ${Y(ys[0]).toFixed(2)}L${X(mxClamped).toFixed(2)} ${Y(yAtMax).toFixed(2)}`;
        }
        areaIn = `${curveIn}L${X(mxClamped).toFixed(2)} ${base}L${X(0).toFixed(2)} ${base}Z`;
      }
      if (mxClamped < xMax) {
        curveOut = `M${X(mxClamped).toFixed(2)} ${Y(yAtMax).toFixed(2)}`;
        for (let i = si; i < xs.length; i++) {
          curveOut += `L${X(xs[i]).toFixed(2)} ${Y(ys[i]).toFixed(2)}`;
        }
        areaOut = `${curveOut}L${X(xMax).toFixed(2)} ${base}L${X(mxClamped).toFixed(2)} ${base}Z`;
      }
    }

    const xStep = niceCeil(xMax / (small ? 4 : 6));
    const xTicks: { v: number; px: number }[] = [];
    for (let v = 0; v <= xMax + 1e-9; v += xStep) {
      xTicks.push({ v, px: X(v) });
    }

    const yStep = niceCeil(yMax / 3);
    const yTicks: { v: number; py: number }[] = [];
    for (let v = 0; v <= yMax; v += yStep) {
      const py = Y(v);
      if (py < PT - 1) break;
      yTicks.push({ v, py });
    }

    const mean = k / r;
    const median = gammaQuantile(0.5, k, r);
    const meanPx = X(Math.min(mean, xMax));
    const medianPx = X(Math.min(median, xMax));
    const maxPx = X(mxClamped);

    const p = hasMax ? Math.min(1, Math.max(0, gammaCdf(mx, k, r))) : 1;
    const truncMean = hasMax ? (p > 1e-9 ? ((k / r) * gammaP(k + 1, r * mx)) / p : 0) : mean;

    return {
      W, H, PL, PR, PT, PB, iw, ih, base,
      xMax, yMax, X, Y,
      areaIn, areaOut, curveIn, curveOut,
      xTicks, yTicks,
      mean, median, meanPx, medianPx, maxPx, mxClamped,
      p, truncMean,
    };
  }, [size, k, r, hasMax, mx]);

  const getLocalX = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) return 0;
    const rect = svgRef.current.getBoundingClientRect();
    return e.clientX - rect.left;
  };

  const updateMaxFromPx = (px: number) => {
    const { PL, iw, xMax } = chart;
    let v = ((px - PL) / iw) * xMax;
    v = Math.max(0, Math.min(xMax, v));
    const step = xMax > 40 ? 0.5 : xMax > 8 ? 0.1 : 0.05;
    const nextMax = Number((Math.round(v / step) * step).toFixed(2));
    onCutoffDrag(nextMax);
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!hasMax) return;
    const px = getLocalX(e);
    if (Math.abs(px - chart.maxPx) < 20) {
      setDragging(true);
      setHoverX(null);
      e.currentTarget.setPointerCapture(e.pointerId);
      updateMaxFromPx(px);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const px = getLocalX(e);
    if (dragging) {
      updateMaxFromPx(px);
      return;
    }
    if (e.pointerType === 'touch') return;
    const { PL, iw, xMax } = chart;
    if (px < PL || px > PL + iw) {
      setHoverX(null);
      return;
    }
    const xVal = Math.max(0, Math.min(xMax, ((px - PL) / iw) * xMax));
    setHoverX(xVal);
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (dragging) {
      setDragging(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const hoverDetails = useMemo(() => {
    if (hoverX === null) return null;
    const d = gammaPdf(hoverX, k, r);
    const safeD = Number.isFinite(d) ? d : chart.yMax;
    const c = gammaCdf(hoverX, k, r);
    const over = hasMax && hoverX > mx;
    const px = chart.X(hoverX);
    const py = Math.max(chart.PT - 2, chart.Y(Math.min(safeD, chart.yMax)));
    return { x: hoverX, d, c, over, px, py };
  }, [hoverX, k, r, hasMax, mx, chart]);

  const coveragePct = chart.p * 100;
  const excludedPct = (1 - chart.p) * 100;

  return (
    <div className="flex flex-col gap-3 md:col-span-8">
      <div className="flex flex-col justify-between rounded-lg border bg-muted/20 p-3">
        {/* Legend */}
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-xs bg-indigo-500" />
              Selectable
            </span>
            {hasMax && (
              <span className="flex items-center gap-1.5">
                <span
                  className="h-2.5 w-2.5 rounded-xs border border-rose-500/50"
                  style={{
                    background:
                      'repeating-linear-gradient(45deg, rgba(244,63,94,0.7), rgba(244,63,94,0.7) 2px, rgba(244,63,94,0.15) 2px, rgba(244,63,94,0.15) 4px)',
                  }}
                />
                Excluded
              </span>
            )}
          </div>
          {hasMax && (
            <span className="hidden items-center gap-1 text-[11px] text-muted-foreground/80 sm:flex">
              <MoveHorizontal className="h-3 w-3" />
              Drag handle on chart
            </span>
          )}
        </div>

        {/* SVG Chart Wrapper */}
        <div ref={wrapRef} className="relative h-[250px] w-full select-none">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${chart.W} ${chart.H}`}
            className="h-full w-full touch-none overflow-visible"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={() => !dragging && setHoverX(null)}
            style={{
              cursor: dragging
                ? 'ew-resize'
                : hasMax && hoverDetails && Math.abs(hoverDetails.px - chart.maxPx) < 20
                ? 'ew-resize'
                : 'crosshair',
            }}
          >
            <defs>
              <linearGradient id="gammaGradIn" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity="0.48" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.04" />
              </linearGradient>
              <pattern
                id="gammaHatchOut"
                width="7"
                height="7"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <rect width="7" height="7" fill="rgba(244, 63, 94, 0.08)" />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="7"
                  stroke="rgba(244, 63, 94, 0.45)"
                  strokeWidth="1.6"
                />
              </pattern>
              <clipPath id="gammaPlotClip">
                <rect
                  x={chart.PL}
                  y={chart.PT - 2}
                  width={chart.iw}
                  height={chart.ih + 2}
                />
              </clipPath>
            </defs>

            {/* Y-axis gridlines */}
            {chart.yTicks.map((t, idx) => (
              <g key={idx}>
                <line
                  x1={chart.PL}
                  y1={t.py}
                  x2={chart.PL + chart.iw}
                  y2={t.py}
                  stroke="currentColor"
                  className="text-border/60"
                  strokeWidth="1"
                />
                <text
                  x={chart.PL - 8}
                  y={t.py + 3}
                  textAnchor="end"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {fmt(t.v, t.v < 1 ? 2 : 1)}
                </text>
              </g>
            ))}

            {/* Clipped curves and areas */}
            <g clipPath="url(#gammaPlotClip)">
              {chart.areaOut && <path d={chart.areaOut} fill="url(#gammaHatchOut)" />}
              {chart.areaIn && <path d={chart.areaIn} fill="url(#gammaGradIn)" />}
              {chart.curveOut && (
                <path
                  d={chart.curveOut}
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="2"
                  strokeDasharray="5 4"
                  strokeLinecap="round"
                />
              )}
              {chart.curveIn && (
                <path
                  d={chart.curveIn}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              )}

              {/* Median Line */}
              <line
                x1={chart.medianPx}
                y1={chart.PT}
                x2={chart.medianPx}
                y2={chart.base}
                stroke="#94a3b8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={chart.medianPx + 4}
                y={chart.PT + 11}
                className="fill-muted-foreground text-[10px] tabular-nums"
              >
                Median
              </text>
            </g>

            {/* X-axis ticks */}
            <line
              x1={chart.PL}
              y1={chart.base}
              x2={chart.PL + chart.iw}
              y2={chart.base}
              stroke="currentColor"
              className="text-border"
            />
            {chart.xTicks.map((t, idx) => (
              <g key={idx}>
                <line
                  x1={t.px}
                  y1={chart.base}
                  x2={t.px}
                  y2={chart.base + 4}
                  stroke="currentColor"
                  className="text-border"
                />
                <text
                  x={t.px}
                  y={chart.base + 16}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[10px] tabular-nums"
                >
                  {fmt(t.v, t.v < 10 ? 1 : 0)}
                </text>
              </g>
            ))}

            <text
              x={chart.PL - 8}
              y={chart.PT - 6}
              textAnchor="end"
              className="fill-muted-foreground text-[9px] uppercase"
            >
              pdf
            </text>

            {/* Cutoff handle */}
            {hasMax && (
              <g className="cursor-ew-resize">
                <line
                  x1={chart.maxPx}
                  y1={chart.PT - 6}
                  x2={chart.maxPx}
                  y2={chart.base}
                  stroke="#f43f5e"
                  strokeWidth="2"
                />
                <rect
                  x={chart.maxPx - 24}
                  y={chart.PT - 18}
                  width="48"
                  height="16"
                  rx="8"
                  fill="#f43f5e"
                />
                <text
                  x={chart.maxPx}
                  y={chart.PT - 7}
                  textAnchor="middle"
                  className="fill-white text-[10px] font-semibold tabular-nums"
                >
                  {fmt(mx, mx < 10 ? 1 : 0)}
                </text>
                <circle
                  cx={chart.maxPx}
                  cy={chart.base}
                  r="4"
                  fill="#f43f5e"
                  stroke="white"
                  strokeWidth="1.5"
                />
              </g>
            )}

            {/* Hover Crosshair */}
            {hoverDetails && !dragging && (
              <g className="pointer-events-none">
                <line
                  x1={hoverDetails.px}
                  y1={chart.PT - 2}
                  x2={hoverDetails.px}
                  y2={chart.base}
                  stroke={hoverDetails.over ? '#f43f5e' : '#6366f1'}
                  strokeOpacity="0.6"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <circle
                  cx={hoverDetails.px}
                  cy={hoverDetails.py}
                  r="4"
                  fill={hoverDetails.over ? '#f43f5e' : '#6366f1'}
                  stroke="white"
                  strokeWidth="1.5"
                />
              </g>
            )}
          </svg>

          {/* Floating Hover Tooltip */}
          {hoverDetails && !dragging && (
            <div
              className="pointer-events-none absolute z-20 rounded-md border bg-popover/95 px-2.5 py-1.5 text-[11px] text-popover-foreground shadow-md backdrop-blur-xs"
              style={{
                left: `${Math.max(4, Math.min(chart.W - 135, hoverDetails.px - 65))}px`,
                top: `${Math.max(4, Math.min(chart.H - 76, hoverDetails.py - 74))}px`,
              }}
            >
              <div className="font-semibold tabular-nums">t = {fmt(hoverDetails.x)}</div>
              <div className="text-muted-foreground tabular-nums">
                P(T ≤ t): {(hoverDetails.c * 100).toFixed(1)}%
              </div>
              <div
                className={`mt-0.5 font-medium ${
                  hoverDetails.over ? 'text-rose-500' : 'text-indigo-500'
                }`}
              >
                {hoverDetails.over ? '✕ Excluded (> cutoff)' : '✓ Selectable'}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Coverage Card */}
      <div className="rounded-lg border bg-muted/20 p-3">
        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Probability within cutoff
            </div>
            <div className="mt-0.5 flex items-baseline gap-2">
              <span className="text-xl font-semibold tabular-nums">
                {coveragePct.toFixed(coveragePct > 99.9 && coveragePct < 100 ? 2 : 1)}%
              </span>
              {hasMax && (
                <span className="text-xs font-medium text-rose-500 tabular-nums">
                  · {excludedPct.toFixed(excludedPct < 1 && excludedPct > 0 ? 2 : 1)}% excluded
                </span>
              )}
            </div>
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>
              Effective mean:{' '}
              <span className="font-medium text-foreground tabular-nums">
                {fmt(chart.truncMean)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-2.5 flex h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-indigo-500 transition-all duration-150"
            style={{ width: `${coveragePct}%` }}
          />
          {hasMax && (
            <div
              className="h-full transition-all duration-150"
              style={{
                width: `${excludedPct}%`,
                background:
                  'repeating-linear-gradient(45deg, rgba(244,63,94,0.8), rgba(244,63,94,0.8) 3px, rgba(244,63,94,0.25) 3px, rgba(244,63,94,0.25) 6px)',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}