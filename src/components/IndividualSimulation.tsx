import React, { useState } from 'react';
import IndividalChart from '../visualisations/IndividualChart';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import type {
  RateKey,
  DynamicMeans,
  Distribution,
  ParamConfig,
  ParamConfigs,
  Patient,
  SimulationParams,
  ViewMode,
  IndividualSimulationResult
} from '../types/simulation';

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

  const handlePatientChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    const updatedPatient: Patient = {
      ...patient,
      [name]: type === 'checkbox' ? checked : parseFloat(value) || 0,
    };
    setPatient(updatedPatient);

    const newRates = getDefaultRates(updatedPatient.age, updatedPatient.vaccinated);
    setParams((prev) => ({
      ...prev,
      ...newRates,
    }));
  };

  const handleParamChange = (name: RateKey, rawValue: string) => {
    if (rawValue === '') {
      setParams((prev) => ({ ...prev, [name]: '' }));
      return;
    }

    const val = parseFloat(rawValue);
    const config = paramConfigs[name];

    if (config && (val < config.min || val > config.max)) {
      return;
    }

    setParams((prev) => ({
      ...prev,
      [name]: val,
    }));
  };

  const handleRunSimulation = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (window.electronAPI?.runModel) {
        // 3. 'data' is now automatically inferred as IndividualSimulationResult
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
    <div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '2.5rem',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ flex: '0 0 420px', maxWidth: '450px' }}>
          <h3>Parameters</h3>

          <form
            onSubmit={handleRunSimulation}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}
          >
            <Tabs
              value={viewMode}
              onValueChange={(val) => setViewMode(val as ViewMode)}
              className="w-full gap-[0.8rem]"
            >
              <TabsList variant="line">
                <TabsTrigger value="simple">Simple Mode</TabsTrigger>
                <TabsTrigger value="advanced">Advanced Mode</TabsTrigger>
              </TabsList>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Time to treatment (t_sigma):</label>
                <input
                  type="number"
                  name="t_sigma"
                  min="0"
                  value={params.t_sigma}
                  onChange={(e) =>
                    setParams((prev) => ({ ...prev, t_sigma: parseFloat(e.target.value) || 0 }))
                  }
                  style={{ width: '90px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Dose:</label>
                <input
                  type="number"
                  name="dose"
                  min="0"
                  value={params.dose}
                  onChange={(e) =>
                    setParams((prev) => ({ ...prev, dose: parseFloat(e.target.value) || 0 }))
                  }
                  style={{ width: '90px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label>Dosing Duration:</label>
                <input
                  type="number"
                  name="dosing_duration"
                  min="0"
                  value={params.dosing_duration}
                  onChange={(e) =>
                    setParams((prev) => ({
                      ...prev,
                      dosing_duration: parseFloat(e.target.value) || 0,
                    }))
                  }
                  style={{ width: '90px' }}
                />
              </div>

              <hr style={{ width: '100%', margin: '0.4rem 0' }} />

              <TabsContent value="simple" className="flex flex-col gap-[0.8rem]">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Age:</label>
                  <input
                    type="number"
                    name="age"
                    min="0"
                    value={patient.age}
                    onChange={handlePatientChange}
                    style={{ width: '90px' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Vaccinated:</label>
                  <input
                    type="checkbox"
                    name="vaccinated"
                    checked={patient.vaccinated}
                    onChange={handlePatientChange}
                  />
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="flex flex-col gap-[0.8rem]">
                {(Object.entries(paramConfigs) as [RateKey, ParamConfig][]).map(
                  ([paramName, config]) => (
                    <div
                      key={paramName}
                      style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <label style={{ fontSize: '0.85rem' }}>
                          {PARAM_LABELS[paramName] || paramName}
                        </label>
                        <input
                          type="number"
                          min={config.min}
                          max={config.max}
                          step="any"
                          value={params[paramName] ?? config.defaultVal}
                          onChange={(e) => handleParamChange(paramName, e.target.value)}
                          style={{ width: '75px' }}
                        />
                      </div>
                      <input
                        type="range"
                        min={config.min}
                        max={config.max}
                        step={config.step}
                        value={params[paramName] === '' ? config.defaultVal : params[paramName]}
                        onChange={(e) => handleParamChange(paramName, e.target.value)}
                      />
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: '0.7rem',
                          color: '#666',
                        }}
                      >
                        <span>Min: {config.min}</span>
                        <span>Max: {config.max}</span>
                      </div>
                    </div>
                  )
                )}
              </TabsContent>
            </Tabs>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: '0.75rem',
                padding: '0.6rem 1rem',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Running...' : 'Run Simulation'}
            </button>
          </form>

          {error && <p style={{ color: 'red', marginTop: '1rem' }}>Error: {error}</p>}
        </div>

        <div style={{ flex: '1 1 0', minWidth: '400px' }}>
          <IndividalChart results={results} />
        </div>
      </div>
    </div>
  );
}