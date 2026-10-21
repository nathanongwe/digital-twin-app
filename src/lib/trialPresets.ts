import type { TrialSimulationParams } from '@/types/simulation';
import { none } from 'node_modules/@base-ui/react/internals/reason-parts.mjs';

/**
 * Named parameter presets for the trial simulation.
 *
 * The key is the name displayed in the preset selector. Add further presets
 * by adding another entry to this map.
 */
export const TRIAL_PRESETS: Record<string, TrialSimulationParams> = {
  PLATCOV: {
    runs: 100,
    control_sample_size: 84,
    treatment_sample_size: 58,
    dose: 300,
    dosing_duration: 5,
    vaccination_proportion: 1.0,
    age_mean: 29.8,
    age_sd: 8.22,
    t_psi_shape: 6.3521, 
    t_psi_rate: 3.0167, 
    has_t_psi_max: true,
    t_psi_max: 4.0,
  },
  RECOVERY: {
    runs: 100,
    control_sample_size: 69,
    treatment_sample_size: 68,
    dose: 300,
    dosing_duration: 5,
    vaccination_proportion: 0.847,
    age_mean: 72.5,
    age_sd: 13.9,
    t_psi_shape: 1.7778,
    t_psi_rate: 0.3556, 
    has_t_psi_max: false,
    t_psi_max: -1, 
  },
  "EPIC-SR": {
    runs: 100,
    control_sample_size: 638,
    treatment_sample_size: 658,
    dose: 300,
    dosing_duration: 5,
    vaccination_proportion: 0.569,
    age_mean: 47.3,
    age_sd: 10.5,
    t_psi_shape: 7.9696,
    t_psi_rate: 2.5018, 
    has_t_psi_max: true,
    t_psi_max: 5, 
  },
  "EPIC-HR": {
    runs: 100,
    control_sample_size: 1126,
    treatment_sample_size: 1120,
    dose: 300,
    dosing_duration: 5,
    vaccination_proportion: 0,
    age_mean: 49.5,
    age_sd: 10.1,
    t_psi_shape: 7.2410,
    t_psi_rate: 2.4463, 
    has_t_psi_max: true,
    t_psi_max: 3, 
  },
};
