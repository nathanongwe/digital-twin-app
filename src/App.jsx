import { useState } from 'react';
import IndividualSimulation from './components/IndividualSimulation';
import PopulationSimulation from './components/PopulationSimulation';
import TrialSimulation from './components/TrialSimulation';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Separator } from './components/ui/separator';

export default function App() {
  const [activeTab, setActiveTab] = useState('individual'); // 'individual' | 'trial'

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* 1. Sticky Navigation Header */}
      <header className="sticky top-0 z-20 border-b bg-card/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold tracking-tight">Digital Twin App</h1>
            </div>
          </div>

          {/* 2. Top-level Page Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Uses default pill variant */}
            <TabsList className="grid w-[360px] grid-cols-2" variant="line">
              <TabsTrigger value="individual">Individual Modelling</TabsTrigger>
              <TabsTrigger value="trial">Clinical Trial Modelling</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </header>

      {/* 3. Centered Page Content Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 p-6">
        {activeTab === 'individual' && <IndividualSimulation />}
        {activeTab === 'trial' && <TrialSimulation />}
      </main>
    </div>
  );
}
