#include "auc_analysis.hpp"

#include <algorithm>
#include <cmath>
#include <numeric>
#include <limits>
#include <boost/math/distributions/students_t.hpp>

static double calculateAUC(const IndividualResults& result, double sigma_offset){
    const auto& values = result.log10V_observed;

    if (values.size() < 2 || result.dt <= 0.0) {
        return std::numeric_limits<double>::quiet_NaN();
    }

    int first = static_cast<int>(std::round(result.t_sigma / result.dt));
    int last = static_cast<int>(std::round((result.t_sigma + sigma_offset) / result.dt));

    double first_value = std::max(values[first], 1.3);
    double last_value = std::max(values[last], 1.3);

    double sum_middle = 0.0;
    for (int i = first + 1; i < last; ++i) {
        sum_middle += std::max(values[i], 1.3);
    }

    return result.dt * (0.5 * (first_value + last_value) + sum_middle);
}

AucResult AnalyseAUC(
    const std::vector<IndividualResults>& control_results,
    const std::vector<IndividualResults>& treated_results,
    int sigma_offset
){
    AucResult result;

    // Helper: Compute AUC vector for a group (skip non-finite results)
    auto extractAUCs = [](const std::vector<IndividualResults>& group, double offset) {
        std::vector<double> aucs;
        aucs.reserve(group.size());
        for (const auto& item : group) {
            double auc = calculateAUC(item, offset);
            if (std::isfinite(auc)) {
                aucs.push_back(auc);
            }
        }
        return aucs;
    };

    std::vector<double> auc_c = extractAUCs(control_results, sigma_offset);
    std::vector<double> auc_t = extractAUCs(treated_results, sigma_offset);

    const int n1 = static_cast<int>(auc_c.size());
    const int n2 = static_cast<int>(auc_t.size());

    // Need at least 2 samples per group to compute sample variance and perform a t-test
    if (n1 < 2 || n2 < 2) {
        return result;
    }

    // Calculate Sample Means
    double sum_c = std::accumulate(auc_c.begin(), auc_c.end(), 0.0);
    double sum_t = std::accumulate(auc_t.begin(), auc_t.end(), 0.0);

    result.mean_control = sum_c / static_cast<double>(n1);
    result.mean_treatment = sum_t / static_cast<double>(n2);

    // Calculate Unbiased Sample Variances (s^2 = sum((x - mean)^2) / (n - 1))
    auto calculateVariance = [](const std::vector<double>& data, double mean) {
        double sq_sum = 0.0;
        for (double val : data) {
            double diff = val - mean;
            sq_sum += diff * diff;
        }
        return sq_sum / static_cast<double>(data.size() - 1);
    };

    double var_c = calculateVariance(auc_c, result.mean_control);
    double var_t = calculateVariance(auc_t, result.mean_treatment);

    // Standard errors of the means squared
    double se2_c = var_c / static_cast<double>(n1);
    double se2_t = var_t / static_cast<double>(n2);
    double se_diff = std::sqrt(se2_c + se2_t);

    // Guard against zero variance (all identical points in both groups)
    if (se_diff == 0.0) {
        result.p_value = (result.mean_control == result.mean_treatment) ? 1.0 : 0.0;
        result.significant = (result.p_value < 0.05);
        return result;
    }

    // 3. Welch's t-statistic
    double t_stat = (result.mean_control - result.mean_treatment) / se_diff;

    // 4. Welch-Satterthwaite degrees of freedom
    double num = (se2_c + se2_t) * (se2_c + se2_t);
    double den = (se2_c * se2_c) / (n1 - 1) + (se2_t * se2_t) / (n2 - 1);
    double df = num / den;

    // 5. Two-sided p-value
    boost::math::students_t dist(df);

    // cdf(complement(dist, |t|)) gives P(T > |t|); multiply by 2 for two-tailed
    result.p_value = 2.0 * boost::math::cdf(boost::math::complement(dist, std::abs(t_stat)));
    result.significant = (result.p_value < 0.05);

    return result;
}