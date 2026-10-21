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

// --- Trial Simulation Types ---

export type TrialEndpointKey = 'day3' | 'day5' | 'change' | 'auc' | 'rebound';

export type AncovaEndpointKey = Extract<TrialEndpointKey, 'day3' | 'day5' | 'change'>;

export interface TrialSimulationParams {
  runs: number;
  control_sample_size: number;
  treatment_sample_size: number;
  dose: number;
  dosing_duration: number;
  vaccination_proportion: number;
  age_mean: number;
  age_sd: number;
  t_psi_shape: number;
  t_psi_rate: number;
  has_t_psi_max: boolean;
  t_psi_max: number;
}

// Mirrors `AncovaResult` in native/ancova_analysis.hpp
export interface AncovaResult {
  n: number;
  df_residual: number;
  mean_control: number;
  mean_treatment: number;
  diff: number;
  se_diff: number;
  p_value: number;
  significant: boolean;
  valid: boolean;
}

// Mirrors `AucResult` in native/auc_analysis.hpp
export interface AucResult {
  mean_control: number;
  mean_treatment: number;
  p_value: number;
  significant: boolean;
}

// Mirrors `ReboundResult` in native/rebound_analysis.hpp
export interface ReboundResult {
  proportion_control: number;
  proportion_treatment: number;
  p_value: number;
  significant: boolean;
}

// Mirrors the response assembled in native/trial_worker.hpp::OnOK
export interface TrialSimulationResult {
  runs: number;
  day3: AncovaResult[];
  day5: AncovaResult[];
  change: AncovaResult[];
  auc: AucResult[];
  rebound: ReboundResult[];
}

// Update the global Window definition to include both model runners
declare global {
  interface Window {
    electronAPI?: {
      runModel: (params: SimulationParams) => Promise<IndividualSimulationResult>;
      runTrialModel: (params: TrialSimulationParams) => Promise<TrialSimulationResult>;
    };
  }
}