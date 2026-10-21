export interface GammaParams {
  shape: number;
  rate: number;
  hasMax: boolean;
  max: number;
}

export function lgamma(z: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

export function gammaPdf(x: number, k: number, r: number): number {
  if (x < 0 || k <= 0 || r <= 0) return 0;
  if (x === 0) return k < 1 ? Infinity : k === 1 ? r : 0;
  return Math.exp(k * Math.log(r) + (k - 1) * Math.log(x) - r * x - lgamma(k));
}

export function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 0; n < 500; n++) {
      ap++;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
  } else {
    const FPMIN = 1e-300;
    let b = x + 1 - a;
    let c = 1 / FPMIN;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i < 500; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < FPMIN) d = FPMIN;
      c = b + an / c;
      if (Math.abs(c) < FPMIN) c = FPMIN;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-14) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - lgamma(a)) * h;
  }
}

export const gammaCdf = (x: number, k: number, r: number): number => gammaP(k, r * x);

export function gammaQuantile(p: number, k: number, r: number): number {
  let lo = 0;
  let hi = Math.max(1, k / r + (20 * Math.sqrt(k)) / r + 10 / r);
  for (let i = 0; i < 80 && gammaCdf(hi, k, r) < p; i++) hi *= 1.7;
  for (let i = 0; i < 120; i++) {
    const m = (lo + hi) / 2;
    if (gammaCdf(m, k, r) < p) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

export function fmt(v: number, d = 2): string {
  if (!Number.isFinite(v)) return '∞';
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1000) return v.toFixed(0);
  if (a >= 100) return v.toFixed(1);
  if (a < 0.01) return v.toExponential(1);
  return v.toFixed(d);
}

export function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / e;
  const n = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return n * e;
}