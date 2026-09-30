#include "models.hpp"

#include <cmath>
#include <iostream>
#include <algorithm>
#include <array>

#include <cvode/cvode.h>
#include <nvector/nvector_serial.h>

#include <sunmatrix/sunmatrix_dense.h>
#include <sunlinsol/sunlinsol_dense.h>

#define NEQ 8 // Number of ODE equations in system

// Struct for System Parameters (UserData)
typedef struct {
    sunrealtype infectivity_rate;
    sunrealtype viral_production_rate;
    sunrealtype productive_to_refractory_rate;
    sunrealtype refractory_reversion_rate;
    sunrealtype eclipse_to_refractory_rate;
    sunrealtype virus_clearance_rate;

    sunrealtype k_a, k_PL, k_LP, k_CL, Vol, M, E_max, hill_n, dose;
    sunrealtype productive_clearance_rate, IC50;
    sunrealtype t_dose_start, t_dose_end;
} *UserData;

// Private function to check return values
static int check_retval(int retval, const char* funcname) {
    if (retval < 0) {
        std::cerr << "\nSUNDIALS_ERROR: " << funcname << "() failed with retval = " << retval << "\n\n";
        return 1;
    }
    return 0;
}

// Differential Equations for CVODE
static int f(sunrealtype t, N_Vector x, N_Vector dxdt, void* user_data) {
    UserData sys = (UserData)user_data;
    
    sunrealtype *x_data = N_VGetArrayPointer(x);
    sunrealtype *dxdt_data = N_VGetArrayPointer(dxdt);

    sunrealtype S    = x_data[0];
    sunrealtype R    = x_data[1];
    sunrealtype I_E  = x_data[2];
    sunrealtype I_P  = x_data[3];
    sunrealtype V    = x_data[4];
    sunrealtype A_GI = x_data[5];
    sunrealtype A_P  = x_data[6];
    sunrealtype A_L  = x_data[7];

    sunrealtype C_P_mg_per_mL = A_P / sys->Vol;
    sunrealtype C_P_uM = (C_P_mg_per_mL / sys->M) * 1e6;

    sunrealtype efficacy = 0.0;
    if (t >= sys->t_dose_start && t < sys->t_dose_end) {
        sunrealtype C_n = std::pow(C_P_uM, sys->hill_n);
        sunrealtype IC_n = std::pow(sys->IC50, sys->hill_n);
        efficacy = (C_n / (IC_n + C_n)) * sys->E_max;
    }

    // PK Derivatives
    dxdt_data[5] = -sys->k_a * A_GI;
    dxdt_data[6] = (sys->k_a * A_GI) + (sys->k_LP * A_L) - ((sys->k_PL + sys->k_CL) * A_P);
    dxdt_data[7] = (sys->k_PL * A_P) - (sys->k_LP * A_L);

    // Viral Dynamics Derivatives
    dxdt_data[0] = -(sys->infectivity_rate * S * V) - (sys->productive_to_refractory_rate * S * I_P) + (sys->refractory_reversion_rate * R);
    dxdt_data[1] = (sys->productive_to_refractory_rate * S * I_P) - (sys->refractory_reversion_rate * R);
    dxdt_data[2] = (sys->infectivity_rate * S * V) - (sys->eclipse_to_refractory_rate * I_E);
    dxdt_data[3] = (sys->eclipse_to_refractory_rate * I_E) - (sys->productive_clearance_rate * I_P);
    dxdt_data[4] = ((1.0 - efficacy) * sys->viral_production_rate * I_P) - (sys->virus_clearance_rate * V);

    return 0;
}

// Function for creating RNG
static std::mt19937 create_seeded_engine() {
    // 624 words = 19,937 bits of initial state
    std::array<std::uint_least32_t, std::mt19937::state_size> seed_data;
    std::random_device rd;
    
    std::generate(seed_data.begin(), seed_data.end(), std::ref(rd));
    std::seed_seq seq(seed_data.begin(), seed_data.end());
    
    return std::mt19937(seq);
}

// Functions for Simulating Individual System
bool ModelIndividual(const IndividualParamaters& parameters,
    IndividualResults& results){
        
    std::mt19937 rng = create_seeded_engine();

    return ModelIndividual(parameters, results, rng);
}

bool ModelIndividual(const IndividualParamaters& parameters,
    IndividualResults& results, std::mt19937& rng){
    results.t_sigma = parameters.t_sigma;
    results.dt = parameters.dt;

    std::normal_distribution<double> error_dist(0, 1.17); // Normal distribution for error term

    SUNContext sunctx = nullptr;
    UserData sys = nullptr;
    N_Vector x = nullptr;
    void* cvode_mem = nullptr;
    SUNMatrix A = nullptr;
    SUNLinearSolver LS = nullptr;

    struct ScopeGuard {
        SUNContext* sunctx;
        UserData* sys;
        N_Vector* x;
        void** cvode_mem;
        SUNMatrix* A;
        SUNLinearSolver* LS;

        ~ScopeGuard() {
            if (*LS)        { SUNLinSolFree(*LS); *LS = nullptr; }
            if (*A)         { SUNMatDestroy(*A);  *A = nullptr; }
            if (*cvode_mem) { CVodeFree(cvode_mem); }
            if (*x)         { N_VDestroy(*x);     *x = nullptr; }
            if (*sys)       { free(*sys);         *sys = nullptr; }
            if (*sunctx)    { SUNContext_Free(sunctx); }
        }
    } guard{&sunctx, &sys, &x, &cvode_mem, &A, &LS};

    // 1. Initialize SUNDIALS Context
    int retval = SUNContext_Create(SUN_COMM_NULL, &sunctx);
    if (check_retval(retval, "SUNContext_Create")) return false;

    // 2. Configure System Parameters
    sys = (UserData)malloc(sizeof(*sys));
    sys->t_dose_start = parameters.t_sigma;
    sys->t_dose_end   = parameters.t_sigma + parameters.dosing_duration - parameters.dt;

    sys->infectivity_rate = std::pow(10.0, parameters.infectivity_rate);
    sys->viral_production_rate = std::pow(10.0, parameters.viral_production_rate);
    sys->productive_to_refractory_rate = std::pow(10.0, parameters.productive_to_refractory_rate);
    sys->refractory_reversion_rate = std::pow(10.0, parameters.refractory_reversion_rate);
    sys->productive_clearance_rate = parameters.productive_clearance_rate;
    sys->IC50 = parameters.IC50;

    // Fixed PK/PD parameters
    sys->eclipse_to_refractory_rate = 4.0;
    sys->virus_clearance_rate = 15.0;
    sys->k_a  = 9.98; 
    sys->k_PL = 1.58; 
    sys->k_LP = 1.22; 
    sys->k_CL = 4.96; 
    sys->Vol  = 41743.0; 
    sys->M    = 499.5;   
    sys->E_max  = 0.999; 
    sys->hill_n = 3.16;  

    // 3. Initial State Vector Setup
    x = N_VNew_Serial(NEQ, sunctx);
    if (check_retval(SUNContext_GetLastError(sunctx), "N_VNew_Serial")) return false;
    
    sunrealtype *x_data = N_VGetArrayPointer(x);
    for(int i = 0; i < NEQ; i++) x_data[i] = 0.0;
    x_data[0] = 1e7;  // S
    x_data[4] = 1.0;  // V

    // 4. CVODE Setup (using CV_BDF)
    cvode_mem = CVodeCreate(CV_BDF, sunctx);
    if (check_retval(SUNContext_GetLastError(sunctx), "CVodeCreate")) return false;

    retval = CVodeInit(cvode_mem, f, 0.0, x);
    if (check_retval(retval, "CVodeInit")) return false;

    retval = CVodeSStolerances(cvode_mem, 1e-6, 1e-8); // RelTol and AbsTol
    if (check_retval(retval, "CVodeSStolerances")) return false;

    retval = CVodeSetUserData(cvode_mem, sys);
    if (check_retval(retval, "CVodeSetUserData")) return false;

    // 5. Dense Matrix and Linear Solver setup (Jacobian matrix)
    A = SUNDenseMatrix(NEQ, NEQ, sunctx);
    if (check_retval(SUNContext_GetLastError(sunctx), "SUNDenseMatrix")) return false;

    LS = SUNLinSol_Dense(x, A, sunctx);
    if (check_retval(SUNContext_GetLastError(sunctx), "SUNLinSol_Dense")) return false;

    retval = CVodeSetLinearSolver(cvode_mem, LS, A);
    if (check_retval(retval, "CVodeSetLinearSolver")) return false;

    // 6. Integration Loop
    sunrealtype t_ret = 0.0;

    int total_steps = std::round(parameters.t_max / parameters.dt);
    int steps_per_dose;

    if (!parameters.is_control) { 
        // Stop integration to set efficacy to 0 at end of dosing
        CVodeSetStopTime(cvode_mem, sys->t_dose_end);

        // Calculate steps per dose. Not able to deal with dosing that happens off step, would have to use CVodeSetStopTime
        steps_per_dose = std::round(0.5 / parameters.dt); 
    }

    for (int step = 0; step <= total_steps; ++step) {
        sunrealtype t_out = step * parameters.dt;

        // Step solver forward
        if (step > 0) {
            retval = CVode(cvode_mem, t_out, x, &t_ret, CV_NORMAL);

            if (retval != CV_SUCCESS && retval != CV_TSTOP_RETURN) {
                check_retval(retval, "CVode");
                return false;
            }
        }

        // Apply dose and re-initialize solver 
        if (!parameters.is_control && 
            (t_out >= sys->t_dose_start && t_out <= sys->t_dose_start + 4.5 + 1e-6)) 
        {
            int steps_from_sigma = std::round((t_out - sys->t_dose_start) / parameters.dt);
            if (steps_from_sigma % steps_per_dose == 0) {
                x_data[5] += parameters.dose;
                
                // Re-initialize CVODE after state is manually modified
                retval = CVodeReInit(cvode_mem, t_out, x);
                if (check_retval(retval, "CVodeReInit")){
                    return false;
                };
            }
        }

        // Set efficacy to 0 and re-initialize solver 
        if (!parameters.is_control && std::abs(t_out - (sys->t_dose_end)) < 1e-6) {
            retval = CVodeReInit(cvode_mem, t_out, x);
            if (check_retval(retval, "CVodeReInit")){
                return false;
            }

            // Extend stop time to simulation end
            CVodeSetStopTime(cvode_mem, parameters.t_max);
        }

        // Save results
        float t = static_cast<float>(t_out);

        if (x_data[4] <= 0.0 || std::isnan(x_data[4])) return false; // Drop results where V <= 0 or NaN
        
        double log10V = std::log10(x_data[4]);
        results.log10V.emplace_back(log10V);

        double error_term = error_dist(rng);
        results.log10V_observed.emplace_back(log10V + error_term);

        if (!parameters.is_control)
        {
            double C_P_uM = ((x_data[6] / sys->Vol) / sys->M) * 1e6;

            double epsilon = 0.0;
            if (t_out >= sys->t_dose_start && t_out < sys->t_dose_end) {
                double C_n = std::pow(C_P_uM, sys->hill_n);
                double IC_n = std::pow(sys->IC50, sys->hill_n);
                epsilon = (C_n / (IC_n + C_n)) * sys->E_max;
            }

            results.C_P_uM.emplace_back(C_P_uM);
        }
    }

    return true;
}

// Private function for truncated normal sampling (+- n * sd)
static double SampleTruncatedNormal(std::mt19937& rng, double mean, double sd, double n = 2.0) {
    std::normal_distribution<double> dist(mean, sd);
    double lower_bound = mean - n * sd;
    double upper_bound = mean + n * sd;
    
    double val;
    do {
        val = dist(rng);
    } while (val < lower_bound || val > upper_bound);
    
    return val;
}

// Function for Simulating Population
void ModelPopulation(const PopulationParamaters& population_parameters,
                     std::vector<IndividualResults>& population_results) 
{
    population_results.clear();
    population_results.reserve(population_parameters.sample_size);

    std::random_device rd;
    std::mt19937 rng = create_seeded_engine();

    constexpr double infectivity_rate_mean = -7.24;
    constexpr double infectivity_rate_sd = 0.248;

    constexpr double viral_production_rate_mean = 3.43;
    constexpr double viral_production_rate_sd = 0.118;

    constexpr double productive_to_refractory_rate_mean = -6.93;
    constexpr double productive_to_refractory_rate_sd = 0.0104;

    constexpr double refractory_reversion_rate_mean = -1.12;
    constexpr double refractory_reversion_rate_sd = 0.140;

    constexpr double productive_clearance_rate_sd = 0.218;
    constexpr double ec50_sd = 1.63;

    std::normal_distribution<double> age_dist(population_parameters.age_mean, population_parameters.age_sd);

    int n_vaccinated = static_cast<int>(std::round(population_parameters.sample_size * population_parameters.vaccination_proportion));
    std::vector<bool> vaccinated_status(population_parameters.sample_size, false);
    std::fill_n(vaccinated_status.begin(), n_vaccinated, true);
    std::shuffle(vaccinated_status.begin(), vaccinated_status.end(), rng);

    std::gamma_distribution<double> incubation_period_dist(4.09, 1.0 / 1.14);

    // Symptom onset to randomization (psi)
    std::gamma_distribution<double> psi_dist(population_parameters.t_psi_shape, 1.0 / population_parameters.t_psi_rate);

    for (int i = 0; i < population_parameters.sample_size; ++i) {
        IndividualParamaters individual;

        individual.is_control      = population_parameters.is_control;
        individual.dosing_duration = population_parameters.dosing_duration;
        individual.dose            = population_parameters.dose;
        individual.dt              = population_parameters.dt;
        individual.t_max           = population_parameters.t_max;

        double age = age_dist(rng);
        bool is_age_65_plus = (age >= 65.0);
        bool is_vaccinated  = vaccinated_status[i];

        double productive_clearance_rate_mean = 1.87 - 0.08 * (is_age_65_plus ? 1.0 : 0.0) + 0.10 * (is_vaccinated ? 1.0 : 0.0);
        double ec50_mean  = 3.85 + 0.65 * (is_age_65_plus ? 1.0 : 0.0) - 0.79 * (is_vaccinated ? 1.0 : 0.0);

        individual.infectivity_rate             = SampleTruncatedNormal(rng, infectivity_rate_mean, infectivity_rate_sd);
        individual.viral_production_rate        = SampleTruncatedNormal(rng, viral_production_rate_mean, viral_production_rate_sd);
        individual.productive_to_refractory_rate = SampleTruncatedNormal(rng, productive_to_refractory_rate_mean, productive_to_refractory_rate_sd);
        individual.refractory_reversion_rate     = SampleTruncatedNormal(rng, refractory_reversion_rate_mean, refractory_reversion_rate_sd);
        individual.productive_clearance_rate     = SampleTruncatedNormal(rng, productive_clearance_rate_mean, productive_clearance_rate_sd);
        
        do {
            individual.IC50 = SampleTruncatedNormal(rng, ec50_mean, ec50_sd);
        } while (individual.IC50 <= 0.0); 

        double incubation_period = incubation_period_dist(rng);
        double t_psi; // Time from symptom onset to randomisation
        do {
            t_psi = psi_dist(rng);
        } while ((t_psi < 0.0) || (t_psi > population_parameters.t_psi_max)); // Ensure non-negative symptom-to-randomization time

        individual.t_sigma = std::round(incubation_period + t_psi);

        IndividualResults individual_results;
        individual_results.age = age;
        individual_results.t_psi = t_psi;


        bool success = ModelIndividual(individual, individual_results, rng);

        if (success) population_results.push_back(std::move(individual_results));
    }
}