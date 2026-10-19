import React, { useState } from 'react';
import IndividalChart from '@/visualisations/IndividualChart';
import type {
  RateKey,
  DynamicMeans,
  Distribution,
  ParamConfig,
  ParamConfigs,
  Patient,
  SimulationParams,
  ViewMode,
  IndividualSimulationResult,
} from '@/types/simulation';

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Field, FieldLabel, FieldDescription } from '@/components/ui/field';
import { Switch } from '@/components/ui/switch';

function calculateDynamicMeans(age: number, is_vaccinated: boolean): DynamicMeans {
  const is_age_65_plus = age >= 65.0;

  const productive_clearance_rate_mean =
    1.87 - 0.08 * (is_age_65_plus ? 1.0 : 0.0) + 0.1 * (is_vaccinated ? 1.0 : 0.0);
  const ec50_mean =
    3.85 + 0.65 * (is_age_65_plus ? 1.0 : 0.0) - 0.79 * (is_vaccinated ? 1.0 : 0.0);

  return {
    productive_clearance_rate_mean,
    ec50_mean,
  };
}

function calculateDefaultRanges(age: number, vaccinated: boolean): Record<RateKey, Distribution> {
  const dynamicMeans = calculateDynamicMeans(age, vaccinated);
  return {
    infectivity_rate: { mean: -7.24, sd: 0.248 },
    viral_production_rate: { mean: 3.43, sd: 0.118 },
    productive_to_refractory_rate: { mean: -6.93, sd: 0.0104 },
    refractory_reversion_rate: { mean: -1.12, sd: 0.14 },
    productive_clearance_rate: { mean: dynamicMeans.productive_clearance_rate_mean, sd: 0.218 },
    IC50: { mean: dynamicMeans.ec50_mean, sd: 1.63 },
  };
}

function getParamConfigs(age: number, vaccinated: boolean): ParamConfigs {
  const definitions = calculateDefaultRanges(age, vaccinated);
  const configs = {} as ParamConfigs;

  (Object.keys(definitions) as RateKey[]).forEach((key) => {
    const { mean, sd } = definitions[key];
    configs[key] = {
      min: parseFloat((mean - 2 * sd).toFixed(4)),
      max: parseFloat((mean + 2 * sd).toFixed(4)),
      defaultVal: parseFloat(mean.toFixed(4)),
      step: 0.001,
    };
  });

  if (configs.IC50.min <= 0) {
    configs.IC50.min = 0.001;
  }

  return configs;
}

function getDefaultRates(age: number, vaccinated: boolean): Record<RateKey, number> {
  const configs = getParamConfigs(age, vaccinated);
  return (Object.keys(configs) as RateKey[]).reduce((acc, key) => {
    acc[key] = configs[key].defaultVal;
    return acc;
  }, {} as Record<RateKey, number>);
}

const PARAM_LABELS: Record<RateKey, string> = {
  infectivity_rate: 'Infectivity Rate (β):',
  viral_production_rate: 'Viral Production Rate (π):',
  productive_to_refractory_rate: 'Productive to Refractory (φ):',
  refractory_reversion_rate: 'Refractory Reversion Rate (ρ):',
  productive_clearance_rate: 'Productive Clearance Rate (δ):',
  IC50: 'IC50:',
};

export default function App(): React.JSX.Element {
  const [viewMode, setViewMode] = useState<ViewMode>('simple');

  const [patient, setPatient] = useState<Patient>({
    age: 30,
    vaccinated: false,
  });

  const [params, setParams] = useState<SimulationParams>({
    is_control: false,
    dose: 300,
    dosing_duration: 5,
    t_sigma: 9.0,
    ...getDefaultRates(30, false),
  });

  const [results, setResults] = useState<IndividualSimulationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const paramConfigs = getParamConfigs(patient.age, patient.vaccinated);

  const handlePatientUpdate = (field: keyof Patient, value: number | boolean) => {
    const updatedPatient: Patient = {
      ...patient,
      [field]: value,
    };
    setPatient(updatedPatient);

    const newRates = getDefaultRates(updatedPatient.age, updatedPatient.vaccinated);
    setParams((prev) => ({
      ...prev,
      ...newRates,
    }));
  }

  const handleParamChange = (name: RateKey, rawValue: string | number) => {
    // If changed by the Slider (passes number), save directly
    if (typeof rawValue === 'number') {
      setParams((prev) => ({
        ...prev,
        [name]: rawValue,
      }));
      return;
    }

    // If typed by user (passes string):
    // 1. Only allow valid floating-point characters: optional '-', digits, optional '.'
    if (!/^-?\d*\.?\d*$/.test(rawValue)) {
      return;
    }

    // 2. Keep the raw string in state so '-', '.', and trailing zeros are not wiped out while typing
    setParams((prev) => ({
      ...prev,
      [name]: rawValue,
    }));
  };

  const handleRunSimulation = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (window.electronAPI?.runModel) {
        const data = await window.electronAPI.runModel(params);
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
          <CardContent className="flex flex-col gap-5">
            {/* Section 1: Always-visible Treatment Regimen */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                Treatment Regimen
              </span>

              <Field className="min-h-11 flex-row items-center justify-between space-y-0">
                <div className="flex flex-col gap-0.5">
                  <FieldLabel htmlFor="t_sigma" className="text-sm font-medium text-foreground">
                    t_sigma (t_σ)
                  </FieldLabel>
                  <FieldDescription id="t_sigma-desc" className="text-xs text-muted-foreground">
                    Days from infection to randomisation
                  </FieldDescription>
                </div>

                <div className="relative flex justify-end">
                  <Input
                    id="t_sigma"
                    type="number"
                    min="0"
                    step="0.1"
                    className="h-9 w-28 text-right tabular-nums shadow-xs"
                    value={params.t_sigma}
                    onChange={(e) =>
                      setParams((prev) => ({
                        ...prev,
                        t_sigma: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </Field>

              <Field className="min-h-11 flex-row items-center justify-between space-y-0">
                <div className="flex flex-col gap-0.5">
                  <FieldLabel htmlFor="dose" className="text-sm font-medium text-foreground">
                    Dose (mg)
                  </FieldLabel>
                </div>

                <div className="relative flex justify-end">
                  <Input
                    id="dose"
                    type="number"
                    min="0"
                    step="0.1"
                    className="h-9 w-28 text-right tabular-nums shadow-xs"
                    value={params.dose}
                    onChange={(e) =>
                      setParams((prev) => ({
                        ...prev,
                        dose: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </Field>

              <Field className="min-h-11 flex-row items-center justify-between space-y-0">
                <div className="flex flex-col gap-0.5">
                  <FieldLabel htmlFor="dosing_duration" className="text-sm font-medium text-foreground">
                    Dosing Duration (days)
                  </FieldLabel>
                </div>

                <div className="relative flex justify-end">
                  <Input
                    id="dosing_duration"
                    type="number"
                    min="0"
                    step="0.1"
                    className="h-9 w-28 text-right tabular-nums shadow-xs"
                    value={params.dosing_duration}
                    onChange={(e) =>
                      setParams((prev) => ({
                        ...prev,
                        dosing_duration: parseFloat(e.target.value) || 0,
                      }))
                    }
                  />
                </div>
              </Field>
            </div>

            <Separator />

            {/* Section 2: Mode-Specific Patient / Kinetic Parameters */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Patient Kinetics
                </span>
              </div>

              <Tabs
                value={viewMode}
                onValueChange={(val) => setViewMode(val as ViewMode)}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="simple">Simple Mode</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced Mode</TabsTrigger>
                </TabsList>

                {/* Simple Mode Content */}
                <TabsContent value="simple" className="mt-4 flex flex-col gap-3">
                  <Field className="min-h-11 flex-row items-center justify-between space-y-0">
                    <div className="flex flex-col gap-0.5">
                      <FieldLabel htmlFor="age" className="text-sm font-medium text-foreground">
                        Age
                      </FieldLabel>
                    </div>

                    <div className="relative flex justify-end">
                      <Input
                        id="age"
                        type="number"
                        min="0"
                        className="h-9 w-28 text-right tabular-nums shadow-xs"
                        value={patient.age}
                        onChange={(e) =>
                          handlePatientUpdate('age', parseFloat(e.target.value) || 0)
                        }
                      />
                    </div>
                  </Field>

                  <Field className="min-h-11 flex-row items-center justify-between space-y-0">
                    <div className="flex flex-col gap-0.5">
                      <FieldLabel htmlFor="patient-vaccinated" className="text-sm font-medium text-foreground">
                        Vaccinated Status
                      </FieldLabel>
                      <span className="text-xs text-muted-foreground">
                        {patient.vaccinated ? 'Patient is vaccinated' : 'Patient is unvaccinated'}
                      </span>
                    </div>
                    <Switch
                      id="patient-vaccinated"
                      checked={patient.vaccinated}
                      onCheckedChange={(checked) => handlePatientUpdate('vaccinated', !!checked)}
                    />
                  </Field>
                </TabsContent>

                {/* Advanced Mode Content */}
                <TabsContent value="advanced" className="mt-4 flex flex-col gap-3">
                  {(Object.entries(paramConfigs) as [RateKey, ParamConfig][]).map(
                    ([paramName, config]) => {
                      // Ensure slider value stays clamped and strictly numeric
                      const numericVal = parseFloat(String(params[paramName]));
                      const sliderValue = Number.isNaN(numericVal)
                        ? config.defaultVal
                        : Math.min(Math.max(numericVal, config.min), config.max);
                      const isOutOfBounds =
                        !Number.isNaN(numericVal) &&
                        (numericVal < config.min || numericVal > config.max);

                      return (
                        <div
                          key={paramName}
                          className="flex flex-col gap-2 rounded-lg border bg-muted/30 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <FieldLabel className="text-xs font-medium text-foreground">
                              {PARAM_LABELS[paramName] || paramName}
                            </FieldLabel>
                            <Input
                              type="text"
                              inputMode="decimal"
                              className={`h-7 w-20 bg-background text-right text-xs tabular-nums ${
                                isOutOfBounds ? 'border-destructive text-destructive focus-visible:ring-destructive' : ''
                              }`}
                              value={params[paramName] ?? config.defaultVal}
                              onChange={(e) =>
                                handleParamChange(paramName, e.target.value)
                              }
                              onBlur={() => {
                                // If left empty, incomplete ("-"), or NaN on blur, fallback to default
                                const parsed = parseFloat(String(params[paramName]));
                                if (Number.isNaN(parsed)) {
                                  handleParamChange(paramName, config.defaultVal);
                                } else {
                                  const clamped = Math.min(Math.max(parsed, config.min), config.max);
                                  handleParamChange(paramName, clamped);
                                }
                              }}
                            />
                          </div>

                          <Slider
                            min={config.min}
                            max={config.max}
                            step={config.step}
                            value={[sliderValue]}
                            onValueChange={(val) => {
                              const nextVal = Array.isArray(val) ? val[0] : val;
                              handleParamChange(paramName, nextVal);
                            }}
                          />

                          <div className="flex justify-between text-[11px] tabular-nums text-muted-foreground">
                            <span>Min: {config.min}</span>
                            <span>Max: {config.max}</span>
                          </div>
                        </div>
                      );
                    }
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-2 pt-2">
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
          <IndividalChart results={results} />
        </CardContent>
      </Card>
    </div>
  );
}