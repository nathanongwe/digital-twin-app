// src/App.jsx
import { useState } from 'react';
import IndividualSimulation from './components/IndividualSimulation';
import PopulationSimulation from './components/PopulationSimulation';

export default function App() {
  const [activeTab, setActiveTab] = useState('individual'); // 'individual' | 'population'

  return (
    <div style={{ padding: '1.5rem', fontFamily: 'sans-serif' }}>
      {/* Top Header & Page Navigation Tabs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0 }}>Digital Twin App</h2>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('individual')}
            style={{
              padding: '0.5rem 1rem',
              fontWeight: activeTab === 'individual' ? 'bold' : 'normal',
              background: activeTab === 'individual' ? '#e0e0e0' : 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Individual Modelling
          </button>
          <button
            onClick={() => setActiveTab('population')}
            style={{
              padding: '0.5rem 1rem',
              fontWeight: activeTab === 'population' ? 'bold' : 'normal',
              background: activeTab === 'population' ? '#e0e0e0' : 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Population Modelling
          </button>
        </div>
      </div>

      <hr style={{ marginBottom: '1.5rem', borderColor: '#eee' }} />

      {/* Conditional View Rendering */}
      {activeTab === 'individual' && <IndividualSimulation />}
      {activeTab === 'population' && <PopulationSimulation />}
    </div>
  );
}