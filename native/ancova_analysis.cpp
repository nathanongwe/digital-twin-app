#include "ancova_analysis.hpp"
#include <Eigen/Dense>
#include <boost/math/distributions/students_t.hpp>
#include <cmath>
#include <algorithm>

// Internal patient observation data structure
struct Observation {
    int treated; // 0 = Control, 1 = Treatment
    int age;
    double baseline;
    double response; // y
};

/**
 * Helper function that extracts log10 viral load at target time point (e.g. sigma + offset).
 * Uses nearest matching time within tolerance.
 */
static double PickViralLoad(const std::vector<double>& log10V,
                                   double target_time,
                                   double dt = 0.1,
                                   double tol = 1e-8) 
{
    if (log10V.empty() || dt <= 0.0) {
        return std::numeric_limits<double>::quiet_NaN();
    }

    double idx_real = target_time / dt;
    size_t idx_lower = static_cast<size_t>(std::floor(idx_real));
    size_t idx_upper = idx_lower + 1;

    if (idx_upper >= log10V.size()) {
        if (idx_lower < log10V.size()) return log10V[idx_lower];
        return std::numeric_limits<double>::quiet_NaN();
    }

    // Linear interpolation between the two adjacent steps:
    double fraction = idx_real - static_cast<double>(idx_lower);
    return log10V[idx_lower] + fraction * (log10V[idx_upper] - log10V[idx_lower]);
}

/**
 * Helper function that fits Ordinary Least Squares
 * Computes marginal treatment contrast (Treatment - Control) and two-sided p-value.
 */
static AncovaResult FitAncovaModel(const std::vector<Observation>& obs,
    bool include_age = false) {
    AncovaResult result;
    const int n = static_cast<int>(obs.size());
    const int p = include_age ? 4 : 3; // intercept, treated, baseline, age (optional)

    result.n = n;
    if (n <= p) {
        result.valid = false;
        return result;
    }

    Eigen::MatrixXd X(n, p);
    Eigen::VectorXd y(n);

    for (int i = 0; i < n; ++i) {
        X(i, 0) = 1.0;
        X(i, 1) = static_cast<double>(obs[i].treated);
        X(i, 2) = obs[i].baseline;
        if (include_age) {
            X(i, 3) = obs[i].age;
        }
        y(i) = obs[i].response;
    }

    // Solve OLS using Column-Pivoted QR
    Eigen::ColPivHouseholderQR<Eigen::MatrixXd> qr(X);
    if (qr.rank() < p) {
        result.valid = false;
        return result;
    }

    Eigen::VectorXd beta = qr.solve(y);
    Eigen::VectorXd residuals = y - X * beta;

    double df_res = static_cast<double>(n - p);
    double sigma2 = residuals.squaredNorm() / df_res;

    Eigen::MatrixXd XtX_inv = (X.transpose() * X).inverse();
    Eigen::MatrixXd cov_beta = sigma2 * XtX_inv;

    double diff = beta(1);
    double se_diff = std::sqrt(std::max(0.0, cov_beta(1, 1)));
    double t_stat = (se_diff > 0.0) ? (diff / se_diff) : 0.0;

    double p_value = 1.0;
    if (df_res > 0.0 && se_diff > 0.0) {
        boost::math::students_t dist(df_res);
        p_value = 2.0 * boost::math::cdf(boost::math::complement(dist, std::abs(t_stat)));
    }

    // Estimated Marginal Means (emmeans) evaluated at mean baseline
    double mean_base = X.col(2).mean();
    double emmean_ctrl = beta(0) + beta(2) * mean_base;
    if (include_age) {
        double mean_age = X.col(3).mean();
        emmean_ctrl += beta(3) * mean_age;
    }
    double emmean_treat = emmean_ctrl + beta(1);

    result.df_residual = df_res;
    result.mean_control = emmean_ctrl;
    result.mean_treatment = emmean_treat;
    result.diff = diff;
    result.se_diff = se_diff;
    result.p_value = p_value;
    result.significant = (p_value < 0.05);
    result.valid = true;

    return result;
}

AncovaResult AnalyseEndpoint(
    const std::vector<IndividualResults>& control_results,
    const std::vector<IndividualResults>& treated_results,
    double sigma_offset) 
{
    std::vector<Observation> obs;
    obs.reserve(control_results.size() + treated_results.size());

    auto extract_group = [&](const std::vector<IndividualResults>& group, int treated) {
        for (const auto& ind : group) {
            double base_val = PickViralLoad(ind.log10V_observed, ind.t_sigma);
            double post_val = PickViralLoad(ind.log10V_observed, ind.t_sigma + sigma_offset);

            if (std::isnan(base_val) || std::isnan(post_val)) continue;

            // RECOVERY LoD rule: clamp below LoD to LoD
            base_val = std::max(base_val, 1.3);
            post_val = std::max(post_val, 1.3);

            obs.push_back({treated, ind.age, base_val, post_val});
        }
    };

    extract_group(control_results, 0);
    extract_group(treated_results, 1);

    return FitAncovaModel(obs, true);
}

AncovaResult AnalyseChangeFromBaseline(
    const std::vector<IndividualResults>& control_results,
    const std::vector<IndividualResults>& treated_results,
    double sigma_offset) 
{
    std::vector<Observation> obs;
    obs.reserve(control_results.size() + treated_results.size());

    auto extract_group = [&](const std::vector<IndividualResults>& group, int treated) {
        for (const auto& ind : group) {
            double base_val = PickViralLoad(ind.log10V_observed, ind.t_sigma);
            double post_val = PickViralLoad(ind.log10V_observed, ind.t_sigma + sigma_offset);

            if (std::isnan(base_val) || std::isnan(post_val)) continue;

            // EPIC-HR imputation rule: if < lod_threshold (2.0) -> set to lod_imputed (1.7)
            if (base_val < 2.0) base_val = 1.7;
            if (post_val < 2.0) post_val = 1.7;

            // Subsetting rule: baseline must exceed threshold of 1.7
            if (base_val <= 1.7) continue;

            if (ind.t_psi > 3) continue;

            double change = post_val - base_val;
            obs.push_back({treated, ind.age, base_val, change});
        }
    };

    extract_group(control_results, 0);
    extract_group(treated_results, 1);

    return FitAncovaModel(obs, false);
}

