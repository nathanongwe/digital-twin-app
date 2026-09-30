// src/App.jsx
import { useState } from 'react';
import IndividalChart from '../visualisations/IndividualChart';

function calculateDynamicMeans(age, is_vaccinated) {
  const is_age_65_plus = (age >= 65.0);

  const productive_clearance_rate_mean = 1.87 - 0.08 * (is_age_65_plus ? 1.0 : 0.0) + 0.10 * (is_vaccinated ? 1.0 : 0.0);
  const ec50_mean  = 3.85 + 0.65 * (is_age_65_plus ? 1.0 : 0.0) - 0.79 * (is_vaccinated ? 1.0 : 0.0);

  return {
    productive_clearance_rate_mean,
    ec50_mean,
  };
}

function calculateDefaultRanges(age, vaccinated) {
  const dynamicMeans = calculateDynamicMeans(age, vaccinated);
  return {
    infectivity_rate:{
      mean: -7.24,
      sd: 0.248
    },
    viral_production_rate: {
      mean: 3.43,
      sd: 0.118
    },
    productive_to_refractory_rate: {
      mean: -6.93,
      sd: 0.0104
    },
    refractory_reversion_rate:{
      mean: -1.12,
      sd: 0.140
    },
    productive_clearance_rate: {
      mean: dynamicMeans.productive_clearance_rate_mean,
      sd: 0.218
    },
    IC50: {
      mean: dynamicMeans.ec50_mean,
      sd: 1.63
    },
  };
}

function getParamConfigs(age, vaccinated) {
  const definitions = calculateDefaultRanges(age, vaccinated);
  const configs = {};

  for (const [key, { mean, sd }] of Object.entries(definitions)) {
    configs[key] = {
      min: parseFloat((mean - 2 * sd).toFixed(4)),
      max: parseFloat((mean + 2 * sd).toFixed(4)),
      defaultVal: parseFloat(mean.toFixed(4)),
      step: 0.001,
    };
  }

  if (configs.IC50.min <= 0){
    configs.IC50.min = 0.001;
  }

  return configs;
}

function getDefaultRates(age, vaccinated) {
  const configs = getParamConfigs(age, vaccinated);
  return Object.fromEntries(
    Object.entries(configs).map(([k, v]) => [k, v.defaultVal])
  );
}

const PARAM_LABELS = {
  infectivity_rate: 'Infectivity Rate (β):',
  viral_production_rate: 'Viral Production Rate (π):',
  productive_to_refractory_rate: 'Productive to Refractory (φ):',
  refractory_reversion_rate: 'Refractory Reversion Rate (ρ):',
  productive_clearance_rate: 'Productive Clearance Rate (δ):',
  IC50: 'IC50:',
};

export default function App() {
  const [viewMode, setViewMode] = useState('simple'); // 'simple' | 'advanced'

  const [patient, setPatient] = useState({
    age: 30,
    vaccinated: false,
  });

  const [params, setParams] = useState({
    is_control: false,
    dose: 300,
    dosing_duration: 5,
    t_sigma: 9.0,
    ...getDefaultRates(30, false),
  });

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Dynamic ranges computed on every render based on current patient profile
  const paramConfigs = getParamConfigs(patient.age, patient.vaccinated);

  const handlePatientChange = (e) => {
    const { name, value, type, checked } = e.target;
    const updatedPatient = {
      ...patient,
      [name]: type === 'checkbox' ? checked : parseFloat(value) || 0,
    };
    setPatient(updatedPatient);

    // Sync params to new calculated means
    const newRates = getDefaultRates(updatedPatient.age, updatedPatient.vaccinated);
    setParams((prev) => ({
      ...prev,
      ...newRates,
    }));
  };

  const handleParamChange = (name, rawValue) => {
    if (rawValue === '') {
      setParams((prev) => ({ ...prev, [name]: '' }));
      return;
    }

    const val = parseFloat(rawValue);
    const config = paramConfigs[name];

    // Reject values outside [mean - 2sd, mean + 2sd]
    if (config && (val < config.min || val > config.max)) {
      return;
    }

    setParams((prev) => ({
      ...prev,
      [name]: val,
    }));
  };

  const handleRunSimulation = async (e) => {
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
    } catch (err) {
      setError(err.message || 'Failed to run simulation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: 'sans-serif' }}>
      <h3>Individual Simulation</h3>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: '2.5rem',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
        }}
      >
        {/* Left Column: Form & Inputs */}
        <div style={{ flex: '0 0 420px', maxWidth: '450px' }}>
          <h3>Parameters</h3>

        <form onSubmit={handleRunSimulation} style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
          
          {/* View Mode Toggle */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setViewMode('simple')}
              style={{
                padding: '0.4rem 0.8rem',
                fontWeight: viewMode === 'simple' ? 'bold' : 'normal',
              }}
            >
              Simple Mode
            </button>
            <button
              type="button"
              onClick={() => setViewMode('advanced')}
              style={{
                padding: '0.4rem 0.8rem',
                fontWeight: viewMode === 'advanced' ? 'bold' : 'normal',
              }}
            >
              Advanced Mode
            </button>
          </div>

          {/* Shared Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label>Time to treatment (t_sigma):</label>
            <input
              type="number"
              name="t_sigma"
              min="0"
              value={params.t_sigma}
              onChange={(e) => setParams((prev) => ({ ...prev, t_sigma: parseFloat(e.target.value) || 0 }))}
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
              onChange={(e) => setParams((prev) => ({ ...prev, dose: parseFloat(e.target.value) || 0 }))}
              style={{ width: '90px' }}
            />
          </div>

          <hr style={{ width: '100%', margin: '0.4rem 0' }} />

          {/* Simple Mode View */}
          {viewMode === 'simple' && (
            <>
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
            </>
          )}

          {/* Advanced Mode View */}
          {viewMode === 'advanced' && (
            <>
              {Object.entries(paramConfigs).map(([paramName, config]) => (
                <div key={paramName} style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                    value={params[paramName] ?? config.defaultVal}
                    onChange={(e) => handleParamChange(paramName, e.target.value)}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#666' }}>
                    <span>Min: {config.min}</span>
                    <span>Max: {config.max}</span>
                  </div>
                </div>
              ))}
            </>
          )}

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

        {/* Right Column: Chart Component */}
        <div style={{ flex: '1 1 0', minWidth: '400px' }}>
          <IndividalChart results={results} />
        </div>
      </div>
    </div>
  );
}