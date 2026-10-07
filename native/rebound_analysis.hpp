#pragma once

#include <vector>
#include "models.hpp"

struct ReboundResult {
    double proportion_control = 0.0;
    double proportion_treatment = 0.0;
    double p_value = 1.0;
    bool significant = false;
};

ReboundResult AnalyseRebound(
    const std::vector<IndividualResults>& control_results,
    const std::vector<IndividualResults>& treated_results
);