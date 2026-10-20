#pragma once

#include <vector>
#include <cmath>


inline double PickViralLoad(const std::vector<double>& log10V,
                            double target_time,
                            double dt = 0.1,
                            double tol = 1e-8) 
{
    if (log10V.empty() || dt <= 0.0 || target_time < 0.0) {
        return std::numeric_limits<double>::quiet_NaN();
    }

    double idx_real = target_time / dt;
    std::size_t idx_lower = static_cast<std::size_t>(std::floor(idx_real));
    std::size_t idx_upper = idx_lower + 1;

    if (idx_upper >= log10V.size()) {
        if (idx_lower < log10V.size()) return log10V[idx_lower];
        return std::numeric_limits<double>::quiet_NaN();
    }

    // Linear interpolation between the two adjacent steps:
    double fraction = idx_real - static_cast<double>(idx_lower);
    return log10V[idx_lower] + fraction * (log10V[idx_upper] - log10V[idx_lower]);
}