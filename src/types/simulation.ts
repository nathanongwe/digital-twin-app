export type RateKey =
  | 'infectivity_rate'
  | 'viral_production_rate'
  | 'productive_to_refractory_rate'
  | 'refractory_reversion_rate'
  | 'productive_clearance_rate'
  | 'IC50';

export interface DynamicMeans {
  productive_clearance_rate_mean: number;
  ec50_mean: number;
}

export interface Distribution {
  mean: number;
  sd: number;
}

export interface ParamConfig {
  min: number;
  max: number;
  defaultVal: number;
  step: number;
}

export type ParamConfigs = Record<RateKey, ParamConfig>;

export interface Patient {
  age: number;
  vaccinated: boolean;
}

export interface SimulationParams extends Record<RateKey, number | ''> {
  is_control: boolean;
  dose: number;
  dosing_duration: number;
  t_sigma: number;
}

export type ViewMode = 'simple' | 'advanced';

export interface TreatedDataPoint {
  t: number;
  log10V: number;
  C_P_uM: number;
  log10V_observed: number;
}

export interface ControlDataPoint {
  t: number;
  log10V: number;
}

export interface IndividualSimulationResult {
  treated: TreatedDataPoint[];
  control: ControlDataPoint[];
  inputParams: Record<string, unknown>;
}

// Update the global Window definition to use the actual return type
declare global {
  interface Window {
    electronAPI?: {
      runModel: (params: SimulationParams) => Promise<IndividualSimulationResult>;
    };
  }
}