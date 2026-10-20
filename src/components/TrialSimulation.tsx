import React, { useState } from 'react';
import AncovaSummary from '@/visualisations/AncovaSummary';
import AucSummary from '@/visualisations/AucSummary';
import ReboundSummary from '@/visualisations/ReboundSummary';
import type {
  TrialEndpointKey,
  AncovaEndpointKey,
  TrialSimulationParams,
  TrialSimulationResult,
} from '@/types/simulation';

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field';

const TABS: { key: TrialEndpointKey; label: string }[] = [
  { key: 'day3', label: 'Viral Load Day 3' },
  { key: 'day5', label: 'Viral Load Day 5' },
  { key: 'change', label: 'Change in Viral Load' },
  { key: 'auc', label: 'AUC' },
  { key: 'rebound', label: 'Rebound' },
];

const ANCOVA_KEYS: AncovaEndpointKey[] = ['day3', 'day5', 'change'];

function isAncovaKey(key: TrialEndpointKey): key is AncovaEndpointKey {
  return ANCOVA_KEYS.includes(key as AncovaEndpointKey);
}

const DEFAULT_TRIAL_PARAMS: TrialSimulationParams = {
  runs: 100,
  control_sample_size: 84,
  treatment_sample_size: 58,
  dose: 300,
  vaccination_proportion: 1.0,
  age_mean: 29.8,
  age_sd: 8.22,
  t_psi_shape: 6.3521, // Shape from symptom onset to randomisation
  t_psi_rate: 3.0167, // Rate of time from symptom onset to randomisation
  t_psi_max: 4.0, // Maximum time from symptom onset to randomisation
};

export default function TrialSimulation(): React.JSX.Element {
  const [params, setParams] = useState<TrialSimulationParams>(DEFAULT_TRIAL_PARAMS);
  const [results, setResults] = useState<TrialSimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TrialEndpointKey>('day3');

  const handleParamChange = (name: keyof TrialSimulationParams, rawValue: string) => {
    const parsed = parseFloat(rawValue);
    setParams((prev) => ({
      ...prev,
      [name]: Number.isNaN(parsed) ? 0 : parsed,
    }));
  };

  const handleRunSimulation = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (window.electronAPI?.runTrialModel) {
        const data = await window.electronAPI.runTrialModel(params);
        setResults(data);
      } else {
        throw new Error('Electron API not available');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to run simulation');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
      {/* Left Column: Parameters Card */}
      <Card className="lg:col-span-4">
        <form onSubmit={handleRunSimulation}>
          <CardContent className="flex flex-col gap-4 pb-6">
            {/* Section 1: Trial Design & Sample Sizes */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Trial Design & Regimen
              </span>

              {/* Paired Sample Sizes */}
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="control_sample_size" className="text-xs font-medium text-foreground">
                    Control (N)
                  </FieldLabel>
                  <Input
                    id="control_sample_size"
                    type="number"
                    min="1"
                    className="h-9 w-full text-right tabular-nums shadow-xs"
                    value={params.control_sample_size}
                    onChange={(e) => handleParamChange('control_sample_size', e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="treatment_sample_size" className="text-xs font-medium text-foreground">
                    Treatment (N)
                  </FieldLabel>
                  <Input
                    id="treatment_sample_size"
                    type="number"
                    min="1"
                    className="h-9 w-full text-right tabular-nums shadow-xs"
                    value={params.treatment_sample_size}
                    onChange={(e) => handleParamChange('treatment_sample_size', e.target.value)}
                  />
                </Field>
              </div>

              {/* Dose row */}
              <Field orientation="horizontal" className="flex items-center justify-between pt-1">
                <FieldLabel htmlFor="dose" className="text-sm font-medium text-foreground">
                  Dose (mg)
                </FieldLabel>
                <Input
                  id="dose"
                  type="number"
                  min="0"
                  step="any"
                  className="h-9 w-28 text-right tabular-nums shadow-xs"
                  value={params.dose}
                  onChange={(e) => handleParamChange('dose', e.target.value)}
                />
              </Field>
            </div>

            <Separator />

            {/* Section 2: Patient Demographics */}
            <div className="flex flex-col gap-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Patient Demographics
              </span>

              {/* Paired Age Mean / SD */}
              <div className="grid grid-cols-2 gap-3">
                <Field>
                  <FieldLabel htmlFor="age_mean" className="text-xs font-medium text-foreground">
                    Age Mean (μ)
                  </FieldLabel>
                  <Input
                    id="age_mean"
                    type="number"
                    min="0"
                    step="any"
                    className="h-9 w-full text-right tabular-nums shadow-xs"
                    value={params.age_mean}
                    onChange={(e) => handleParamChange('age_mean', e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="age_sd" className="text-xs font-medium text-foreground">
                    Age SD (σ)
                  </FieldLabel>
                  <Input
                    id="age_sd"
                    type="number"
                    min="0"
                    step="any"
                    className="h-9 w-full text-right tabular-nums shadow-xs"
                    value={params.age_sd}
                    onChange={(e) => handleParamChange('age_sd', e.target.value)}
                  />
                </Field>
              </div>

              {/* Vaccination Proportion */}
              <Field orientation="horizontal" className="flex items-center justify-between pt-1">
                <FieldLabel htmlFor="vaccination_proportion" className="text-sm font-medium text-foreground">
                  Vaccinated Proportion
                </FieldLabel>
                  <Input
                    id="vaccination_proportion"
                    type="number"
                    min="0"
                    max="1"
                    step="0.05"
                    className="h-9 w-28 text-right tabular-nums shadow-xs"
                    value={params.vaccination_proportion}
                    onChange={(e) => handleParamChange('vaccination_proportion', e.target.value)}
                  />
              </Field>
            </div>

            <Separator />

            {/* Section 3: Onset to Randomisation (t_psi) */}
            <div className="flex flex-col gap-2.5">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Onset to Randomisation Distribution
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Gamma distribution parameters for t_psi
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <Field>
                  <FieldLabel htmlFor="t_psi_shape" className="text-xs font-medium text-foreground">
                    Shape (k)
                  </FieldLabel>
                  <Input
                    id="t_psi_shape"
                    type="number"
                    step="any"
                    className="h-9 w-full text-right tabular-nums shadow-xs"
                    value={params.t_psi_shape}
                    onChange={(e) => handleParamChange('t_psi_shape', e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="t_psi_rate" className="text-xs font-medium text-foreground">
                    Rate (β)
                  </FieldLabel>
                  <Input
                    id="t_psi_rate"
                    type="number"
                    step="any"
                    className="h-9 w-full text-right tabular-nums shadow-xs"
                    value={params.t_psi_rate}
                    onChange={(e) => handleParamChange('t_psi_rate', e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="t_psi_max" className="text-xs font-medium text-foreground">
                    Max (days)
                  </FieldLabel>
                  <Input
                    id="t_psi_max"
                    type="number"
                    step="any"
                    className="h-9 w-full text-right tabular-nums shadow-xs"
                    value={params.t_psi_max}
                    onChange={(e) => handleParamChange('t_psi_max', e.target.value)}
                  />
                </Field>
              </div>
            </div>

            <Separator />

            {/* Section 4: Execution Settings */}
            <Field orientation="horizontal" className="flex items-center justify-between pt-1">
              <FieldLabel htmlFor="runs" className="text-sm font-medium text-foreground">
                Simulation Runs
              </FieldLabel>
              <Input
                id="runs"
                type="number"
                min="1"
                step="1"
                className="h-9 w-28 text-right tabular-nums shadow-xs"
                value={params.runs}
                onChange={(e) => handleParamChange('runs', e.target.value)}
              />
            </Field>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-4">
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Running Simulation...' : 'Run Simulation'}
            </Button>

            {error && (
              <p className="text-xs font-medium text-destructive">
                Error: {error}
              </p>
            )}
          </CardFooter>
        </form>
      </Card>

      {/* Right Column: Results Card */}
      <Card className="lg:col-span-8">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Simulation Results</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as TrialEndpointKey)}
            className="w-full"
          >
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
              {TABS.map((tab) => (
                <TabsTrigger key={tab.key} value={tab.key} className="flex-1">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {TABS.map((tab) => (
              <TabsContent key={tab.key} value={tab.key} className="mt-4">
                {isAncovaKey(tab.key) ? (
                  <AncovaSummary runs={results?.[tab.key]} />
                ) : tab.key === 'auc' ? (
                  <AucSummary runs={results?.auc} />
                ) : (
                  <ReboundSummary runs={results?.rebound} />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}