#pragma once

#include <vector>
#include "models.hpp"

struct AucResult {
    double mean_control = 0.0;    // Adjusted marginal mean for Control
    double mean_treatment = 0.0;  // Adjusted marginal mean for Treatment
    double p_value = 1.0;         // Two-tailed p-value
    bool significant = false;     // p_value < 0.05
};

AucResult AnalyseAUC(
    const std::vector<IndividualResults>& control_results,
    const std::vector<IndividualResults>& treated_results,
    int sigma_offset = 5
);
