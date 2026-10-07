// src/App.jsx
import { useState } from 'react';
import IndividualSimulation from './components/IndividualSimulation';
import PopulationSimulation from './components/PopulationSimulation';
import TrialSimulation from './components/TrialSimulation';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Separator } from './components/ui/separator';

export default function App() {
  const [activeTab, setActiveTab] = useState('individual'); // 'individual' | 'trial'

  return (
    <div className="min-h-screen bg-background p-6 text-foreground">
      {/* Top Header & Page Navigation Tabs */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Digital Twin App</h2>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="individual">Individual Modelling</TabsTrigger>
            <TabsTrigger value="trial">Clinical Trial Modelling</TabsTrigger>
          </TabsList>
        </Tabs> 
      </div>

      <Separator className="mb-6" />

      {/* Conditional View Rendering */}
      {activeTab === 'individual' && <IndividualSimulation />}
      {activeTab === 'trial' && <TrialSimulation />}
    </div>
  );
}
