#pragma once

#include <vector>
#include <cmath>
#include <limits>
#include "models.hpp"

// Result of an ANCOVA regression model
struct AncovaResult {
    int n = 0;
    double df_residual = 0.0;
    double mean_control = 0.0;    // Adjusted marginal mean for Control (emmean)
    double mean_treatment = 0.0;  // Adjusted marginal mean for Treatment (emmean)
    double diff = 0.0;            // Treatment - Control (estimate)
    double se_diff = 0.0;         // Standard error of the difference
    double p_value = 1.0;         // Two-tailed p-value
    bool significant = false;     // p_value < 0.05
    bool valid = false;           // False if singular or insufficient sample size
};

/**
 * RECOVERY-style ANCOVA: Absolute viral load at a follow-up day
 * Model: log10VL_post ~ treated + baseline_logVL + age
 */
AncovaResult AnalyseEndpoint(
    const std::vector<IndividualResults>& control_results,
    const std::vector<IndividualResults>& treated_results,
    double sigma_offset = 2.0 // e.g., 2.0 for Day 3, 4.0 for Day 5
);

/**
 * EPIC-HR-style ANCOVA: Change from baseline at a follow-up day
 * Model: (log10VL_post - baseline_logVL) ~ treated + baseline_logVL
 */
AncovaResult AnalyseChangeFromBaseline(
    const std::vector<IndividualResults>& control_results,
    const std::vector<IndividualResults>& treated_results,
    double post_day_offset = 5.0
);