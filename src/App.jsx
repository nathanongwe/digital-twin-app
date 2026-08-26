// src/App.jsx
import { useState } from 'react';
import IndividalChart from './visualisations/IndividualChart';

export default function App() {
  const [params, setParams] = useState({
    is_control: false,
    dose: 300,
    infectivity_rate: -7.137483051,
    viral_production_rate: 3.587304258,
    productive_to_refractory_rate: -6.930776105,
    refractory_reversion_rate: -1.086487909,
    productive_clearance_rate: 1.981952281,
    IC50: 4.280411067,
    t_sigma: 9.0,
  });
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setParams((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : parseFloat(value) || 0,
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
    <div style={{ padding: '1.5rem', fontFamily: 'sans-serif' }}>
      <h2 style={{ marginBottom: '1.5rem' }}>Individual Model Simulation</h2>
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

          <form
            onSubmit={handleRunSimulation}
            style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Time to treatment (t_sigma):</label>
              <input
                type="number"
                step="0.1"
                name="t_sigma"
                value={params.t_sigma}
                onChange={handleChange}
                style={{ width: '90px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Control:</label>
              <input
                type="checkbox"
                name="is_control"
                checked={params.is_control}
                onChange={handleChange}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Dose:</label>
              <input
                type="number"
                name="dose"
                value={params.dose}
                onChange={handleChange}
                style={{ width: '90px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Infectivity Rate (β):</label>
              <input
                type="number"
                step="0.1"
                name="infectivity_rate"
                value={params.infectivity_rate}
                onChange={handleChange}
                style={{ width: '90px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Viral Production Rate (π):</label>
              <input
                type="number"
                step="0.1"
                name="viral_production_rate"
                value={params.viral_production_rate}
                onChange={handleChange}
                style={{ width: '90px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Productive to Refractory (φ):</label>
              <input
                type="number"
                step="0.1"
                name="productive_to_refractory_rate"
                value={params.productive_to_refractory_rate}
                onChange={handleChange}
                style={{ width: '90px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Refractory Reversion Rate (ρ):</label>
              <input
                type="number"
                step="0.1"
                name="refractory_reversion_rate"
                value={params.refractory_reversion_rate}
                onChange={handleChange}
                style={{ width: '90px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>Productive Clearance Rate (δ):</label>
              <input
                type="number"
                step="0.1"
                name="productive_clearance_rate"
                value={params.productive_clearance_rate}
                onChange={handleChange}
                style={{ width: '90px' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label>IC50:</label>
              <input
                type="number"
                step="0.1"
                name="IC50"
                value={params.IC50}
                onChange={handleChange}
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
          <IndividalChart results={results} />
        </div>
      </div>
    </div>
  );
}