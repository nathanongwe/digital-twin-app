import React from 'react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldLabel } from '@/components/ui/field';
import { GammaParams, fmt, gammaQuantile } from './gammaMath';

const SLIDER_MAX_CUTOFF = 7;

interface GammaControlsProps {
  value: GammaParams;
  onChange: (updater: (prev: GammaParams) => GammaParams) => void;
}

export function GammaControls({ value, onChange }: GammaControlsProps): React.JSX.Element {
  const k = Math.max(0.1, value.shape);
  const r = Math.max(0.05, value.rate);
  const median = gammaQuantile(0.5, k, r);
  const stdDev = Math.sqrt(k) / r;

  return (
    <div className="flex flex-col justify-between gap-3 md:col-span-4">
      <div className="flex flex-col gap-3">
        {/* Shape (k) */}
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="dlg_shape" className="text-xs font-medium">
              Shape (k)
            </FieldLabel>
            <Input
              id="dlg_shape"
              type="number"
              step="0.1"
              min="0.1"
              className="h-7 w-20 text-right text-xs tabular-nums"
              value={value.shape}
              onChange={(e) =>
                onChange((d) => ({
                  ...d,
                  shape: Math.max(0.1, parseFloat(e.target.value) || 0.1),
                }))
              }
            />
          </div>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.05"
            value={Math.min(20, value.shape)}
            onChange={(e) =>
              onChange((d) => ({ ...d, shape: parseFloat(e.target.value) }))
            }
            className="w-full cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0.1</span>
            <span>10</span>
          </div>
        </div>

        {/* Rate (β) */}
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <FieldLabel htmlFor="dlg_rate" className="text-xs font-medium">
              Rate (β)
            </FieldLabel>
            <Input
              id="dlg_rate"
              type="number"
              step="0.05"
              min="0.05"
              className="h-7 w-20 text-right text-xs tabular-nums"
              value={value.rate}
              onChange={(e) =>
                onChange((d) => ({
                  ...d,
                  rate: Math.max(0.05, parseFloat(e.target.value) || 0.05),
                }))
              }
            />
          </div>
          <input
            type="range"
            min="0.05"
            max="5"
            step="0.05"
            value={Math.min(10, value.rate)}
            onChange={(e) =>
              onChange((d) => ({ ...d, rate: parseFloat(e.target.value) }))
            }
            className="w-full cursor-pointer accent-indigo-500"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0.05</span>
            <span>5</span>
          </div>
        </div>

        {/* Cutoff (max) */}
        <div className="flex flex-col gap-2 rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Checkbox
                id="dlg_has_max"
                checked={value.hasMax}
                onCheckedChange={(checked) =>
                  onChange((d) => ({ ...d, hasMax: !!checked }))
                }
              />
              <label
                htmlFor="dlg_has_max"
                className="cursor-pointer text-xs font-medium select-none"
              >
                Cutoff (days)
              </label>
            </div>

            <Input
              id="dlg_max"
              type="number"
              step="0.1"
              min="0"
              disabled={!value.hasMax}
              className="h-7 w-20 text-right text-xs tabular-nums disabled:opacity-40"
              value={value.hasMax ? value.max : ''}
              placeholder={value.hasMax ? undefined : '∞'}
              onChange={(e) =>
                onChange((d) => ({
                  ...d,
                  max: Math.max(0, parseFloat(e.target.value) || 0),
                }))
              }
            />
          </div>

          <input
            type="range"
            min="0"
            max={SLIDER_MAX_CUTOFF}
            step="0.1"
            disabled={!value.hasMax}
            value={Math.min(SLIDER_MAX_CUTOFF, value.max)}
            onChange={(e) =>
              onChange((d) => ({ ...d, max: parseFloat(e.target.value) }))
            }
            className="w-full cursor-pointer accent-rose-500 disabled:cursor-not-allowed disabled:opacity-30"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>0</span>
            <span>{SLIDER_MAX_CUTOFF}</span>
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border bg-muted/15 px-2.5 py-2">
          <div className="text-[10px] uppercase text-muted-foreground">Median</div>
          <div className="mt-0.5 font-semibold tabular-nums">{fmt(median)}</div>
        </div>
        <div className="rounded-lg border bg-muted/15 px-2.5 py-2">
          <div className="text-[10px] uppercase text-muted-foreground">Mean</div>
          <div className="mt-0.5 font-semibold tabular-nums">{fmt(k/r)}</div>
        </div>
      </div>
    </div>
  );
}