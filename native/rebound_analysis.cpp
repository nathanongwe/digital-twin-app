#include "rebound_analysis.hpp"
#include <analysis_helpers.hpp>
#include <boost/math/distributions/hypergeometric.hpp>

static bool findRebound(const IndividualResults& result){
    double day5 = PickViralLoad(result.log10V_observed, 5, result.dt);
    double day10 = PickViralLoad(result.log10V_observed, 10, result.dt);
    double day14 = PickViralLoad(result.log10V_observed, 14, result.dt);

    if(day5 < 2){
        return ((day10 >= 3) || (day14 >= 3));
    }
    else{
        double increase = std::max(day10, day14) - day5;

        return ((increase >= 0.5) && (std::max(day10, day14) >= 3));
    }
}

static double fisher_exact_test(int control_rebound, int control_size,
                                int treatment_rebound, int treatment_size) {
    if (control_size <= 0 || treatment_size <= 0) {
        return 1.0;
    }

    const int a = control_rebound; // Number of rebounds in control population
    const int b = treatment_rebound; // Number of rebounds in Treatment population
    const int k = a + b; // Total rebounds
    const int N = control_size + treatment_size; // Total sample size

    // If no one rebounded or everyone rebounded, the outcome is uniform
    if (k == 0 || k == N) {
        return 1.0;
    }

    boost::math::hypergeometric_distribution<double> dist(control_size, k, N);

    const double p_observed = boost::math::pdf(dist, a);

    // Minimum number of rebounds in control population
    const int min_a = std::max(0, k - treatment_size);
    // Maximum number of rebounds in control population
    const int max_a = std::min(control_size, k);

    double p_value = 0.0;

    // Iterate over every possible value of a
    for (int i = min_a; i <= max_a; ++i) {
        // Calculates hypergeometric probability
        double p_i = boost::math::pdf(dist, i);

        // If outcome is extreme or more extreme
        if (p_i <= p_observed * (1.0 + 1e-8)) {
            p_value += p_i;
        }
    }

    return std::min(1.0, p_value);
}

ReboundResult AnalyseRebound(
    const std::vector<IndividualResults>& control_results,
    const std::vector<IndividualResults>& treated_results
){
    ReboundResult result;

    if (control_results.empty() || treated_results.empty()) {
        result.proportion_control = 0.0;
        result.proportion_treatment = 0.0;
        result.p_value = 1.0;
        return result;
    }

    int control_rebounds = 0;
    int treatment_rebounds = 0;
    
    for (const auto& res : control_results){
        if (findRebound(res)){
            control_rebounds+=1;
        }
    }

    for (const auto& res : treated_results){
        if (findRebound(res)){
            treatment_rebounds+=1;
        }
    }

    result.proportion_control = static_cast<double>(control_rebounds) / control_results.size();
    result.proportion_treatment = static_cast<double>(treatment_rebounds) / treated_results.size();

    result.p_value = fisher_exact_test(
        control_rebounds, static_cast<int>(control_results.size()),
        treatment_rebounds, static_cast<int>(treated_results.size())
    );

    return result;
}