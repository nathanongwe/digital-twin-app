#include <vector>

// Struct for storing Individual Modelling Parameters
struct IndividualParamaters{
    bool is_control = false; // If true drug will not be administered

    double t_sigma; // Time from infection to randomization (days)
    double infectivity_rate;
    double viral_production_rate;
    double productive_to_refractory_rate;
    double refractory_reversion_rate;
    double productive_clearance_rate;
    double IC50;

    int dosing_duration = 5;
    int dose = 300;

    double dt = 0.1;
    int t_max = 30;
};

// Struct for storing Individual Modelling Results
struct IndividualResults{
    std::vector<float> t;
    std::vector<double> log10V;
    
    std::vector<double> C_P_uM;
    std::vector<double> epsilon;

    void init(size_t expected_steps, bool is_control) {
        t.reserve(expected_steps);
        log10V.reserve(expected_steps);
        if (!is_control) {
            C_P_uM.reserve(expected_steps);
            epsilon.reserve(expected_steps);
        }
    }
};

bool ModelIndividual(const IndividualParamaters& parameters,
    IndividualResults& results
);


// Struct for storing Population Modelling Parameters
struct PopulationParamaters{
    int sample_size;
    bool is_control = false; // If false drug will not be administered

    int dosing_duration = 5;
    int dose = 300;

    double dt = 0.1;
    int t_max = 30;

    double vaccination_proportion;
    double age_mean;
    double age_sd;

    double t_psi_shape; // Shape from symptom onset to randomisation
    double t_psi_rate; // Rate of time from symptom onset to randomisation
    double t_psi_max; // Maximum time from symptom onset to randomisation
};

void ModelPopulation(const PopulationParamaters& population_parameters,
                     std::vector<IndividualResults>& population_results);