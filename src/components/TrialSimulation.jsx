import { useState } from 'react';
import PopulationChart from '../visualisations/PopulationChart';

const DEFAULT_TRIAL_PARAMS = {
  runs: 100,
  control_sample_size: 84,
  treatment_sample_size: 58,
  dose: 300,
  vaccination_proportion: 1.0,
  age_mean: 29.8,
  age_sd: 8.22,
  t_psi_shape: 6.3521, // Shape from symptom onset to randomisation
  t_psi_rate: 3.0167, // Rate of time from symptom onset to randomisation
  t_psi_max: 4.0 // Maximum time from symptom onset to randomisation
};

export default function TrialApp() {
  const [params, setParams] = useState(DEFAULT_TRIAL_PARAMS);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleParamChange = (name, rawValue) => {
    if (rawValue === '') {
      setParams((prev) => ({ ...prev, [name]: '' }));
      return;
    }

    const val = parseFloat(rawValue);
    setParams((prev) => ({
      ...prev,
      [name]: isNaN(val) ? 0 : val,
    }));
  };

  const handleRunSimulation = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (window.electronAPI?.runPopulationModel) {
        const data = await window.electronAPI.runTrialModel(params);
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
      <h3>Clinical Trial Simulation</h3>
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Number of Simulation Runs:</label>
              <input
                type="number"
                name="runs"
                min="1"
                step="1"
                value={params.runs}
                onChange={(e) => handleParamChange('runs', e.target.value)}
                style={{ width: '90px' }}
              />
            </div>

            <hr style={{ width: '100%', margin: '0.4rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Sample Size (Control):</label>
              <input
                type="number"
                name="control_sample_size"
                min="1"
                step="1"
                value={params.control_sample_size}
                onChange={(e) => handleParamChange('control_sample_size', e.target.value)}
                style={{ width: '90px' }}
              />
            </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Sample Size (Treatment):</label>
              <input
                type="number"
                name="treatment_sample_size"
                min="1"
                step="1"
                value={params.treatment_sample_size}
                onChange={(e) => handleParamChange('treatment_sample_size', e.target.value)}
                style={{ width: '90px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Dose:</label>
              <input
                type="number"
                name="dose"
                min="0"
                step="any"
                value={params.dose}
                onChange={(e) => handleParamChange('dose', e.target.value)}
                style={{ width: '90px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Vaccination Proportion:</label>
              <input
                type="number"
                name="vaccination_proportion"
                min="0"
                max="1"
                step="any"
                value={params.vaccination_proportion}
                onChange={(e) => handleParamChange('vaccination_proportion', e.target.value)}
                style={{ width: '90px' }}
              />
            </div>

            <hr style={{ width: '100%', margin: '0.4rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Age Mean:</label>
              <input
                type="number"
                name="age_mean"
                min="0"
                step="any"
                value={params.age_mean}
                onChange={(e) => handleParamChange('age_mean', e.target.value)}
                style={{ width: '90px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Age SD:</label>
              <input
                type="number"
                name="age_sd"
                min="0"
                step="any"
                value={params.age_sd}
                onChange={(e) => handleParamChange('age_sd', e.target.value)}
                style={{ width: '90px' }}
              />
            </div>

            <hr style={{ width: '100%', margin: '0.4rem 0' }} />

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>t_psi Shape:</label>
              <input
                type="number"
                name="t_psi_shape"
                min="0"
                step="any"
                value={params.t_psi_shape}
                onChange={(e) => handleParamChange('t_psi_shape', e.target.value)}
                style={{ width: '90px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>t_psi Rate:</label>
              <input
                type="number"
                name="t_psi_rate"
                min="0"
                step="any"
                value={params.t_psi_rate}
                onChange={(e) => handleParamChange('t_psi_rate', e.target.value)}
                style={{ width: '90px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>t_psi Max:</label>
              <input
                type="number"
                name="t_psi_max"
                min="0"
                step="any"
                value={params.t_psi_max}
                onChange={(e) => handleParamChange('t_psi_max', e.target.value)}
                style={{ width: '90px' }}
              />
            </div>

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
          <PopulationChart results={results} />
        </div>
      </div>
    </div>
  );
}