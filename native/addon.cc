#include <napi.h>
#include <vector>
#include "models.hpp"

// Helper to parse JS object into IndividualParamaters struct
IndividualParamaters ParseIndividualParams(const Napi::Object& obj) {
    IndividualParamaters p;

    if (obj.Has("is_control")) p.is_control = obj.Get("is_control").As<Napi::Boolean>().Value();
    if (obj.Has("t_sigma")) p.t_sigma = obj.Get("t_sigma").As<Napi::Number>().DoubleValue();
    if (obj.Has("infectivity_rate")) p.infectivity_rate = obj.Get("infectivity_rate").As<Napi::Number>().DoubleValue();
    if (obj.Has("viral_production_rate")) p.viral_production_rate = obj.Get("viral_production_rate").As<Napi::Number>().DoubleValue();
    if (obj.Has("productive_to_refractory_rate")) p.productive_to_refractory_rate = obj.Get("productive_to_refractory_rate").As<Napi::Number>().DoubleValue();
    if (obj.Has("refractory_reversion_rate")) p.refractory_reversion_rate = obj.Get("refractory_reversion_rate").As<Napi::Number>().DoubleValue();
    if (obj.Has("productive_clearance_rate")) p.productive_clearance_rate = obj.Get("productive_clearance_rate").As<Napi::Number>().DoubleValue();
    if (obj.Has("IC50")) p.IC50 = obj.Get("IC50").As<Napi::Number>().DoubleValue();
    
    if (obj.Has("dosing_duration")) p.dosing_duration = obj.Get("dosing_duration").As<Napi::Number>().Int32Value();
    if (obj.Has("dose")) p.dose = obj.Get("dose").As<Napi::Number>().Int32Value();
    if (obj.Has("dt")) p.dt = obj.Get("dt").As<Napi::Number>().DoubleValue();
    if (obj.Has("t_max")) p.t_max = obj.Get("t_max").As<Napi::Number>().Int32Value();

    return p;
}

// Wrapper function exposed to Node.js
Napi::Value ModelIndividualWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(env, "Object expected for parameters").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object inputParams = info[0].As<Napi::Object>();
    IndividualParamaters treated_params = ParseIndividualParams(inputParams);
    treated_params.is_control = false;

    // 1. Run Treated Model
    IndividualResults treated_results;
    ModelIndividual(treated_params, treated_results);

    Napi::Array jsTreated = Napi::Array::New(env, treated_results.t.size());
    for (size_t i = 0; i < treated_results.t.size(); ++i) {
        Napi::Object entry = Napi::Object::New(env);
        entry.Set("t", Napi::Number::New(env, treated_results.t[i]));
        entry.Set("log10V", Napi::Number::New(env, treated_results.log10V[i]));
        entry.Set("C_P_uM", Napi::Number::New(env, treated_results.C_P_uM[i]));
        entry.Set("epsilon", Napi::Number::New(env, treated_results.epsilon[i]));
        jsTreated.Set(i, entry);
    }

    // 2. Run Control Model
    IndividualParamaters control_params = treated_params;
    control_params.is_control = true;
    
    IndividualResults control_results;
    ModelIndividual(control_params, control_results);

    Napi::Array jsControl = Napi::Array::New(env, control_results.t.size());
    for (size_t i = 0; i < control_results.t.size(); ++i) {
        Napi::Object entry = Napi::Object::New(env);
        entry.Set("t", Napi::Number::New(env, control_results.t[i]));
        entry.Set("log10V", Napi::Number::New(env, control_results.log10V[i]));
        jsControl.Set(i, entry);
    }

    // 3. Return combined output object { treated: [...], control: [...] }
    Napi::Object response = Napi::Object::New(env);
    response.Set("treated", jsTreated);
    response.Set("control", jsControl);
    response.Set("inputParams", inputParams);

    return response;
}

// Helper to extract log10V at end of treatment (t = t_sigma + dosing_duration)
double GetEndOfTreatmentViralLoad(const IndividualResults& res, double t_end) {
    if (res.t.empty()) return 0.0;
    size_t closest_idx = 0;
    double min_diff = std::abs(res.t[0] - t_end);
    for (size_t i = 1; i < res.t.size(); ++i) {
        double diff = std::abs(res.t[i] - t_end);
        if (diff < min_diff) {
            min_diff = diff;
            closest_idx = i;
        }
    }
    return res.log10V[closest_idx];
}

Napi::Value ModelPopulationWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(env, "Object expected for population parameters").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object obj = info[0].As<Napi::Object>();
    PopulationParamaters pop_params;

    int control_n = obj.Has("control_sample_size") ? obj.Get("control_sample_size").As<Napi::Number>().Int32Value() : 84;
    int treated_n = obj.Has("treatment_sample_size") ? obj.Get("treatment_sample_size").As<Napi::Number>().Int32Value() : 58;
    
    pop_params.dose = obj.Has("dose") ? obj.Get("dose").As<Napi::Number>().Int32Value() : 300;
    pop_params.dosing_duration = obj.Has("dosing_duration") ? obj.Get("dosing_duration").As<Napi::Number>().Int32Value() : 5;
    pop_params.dt = obj.Has("dt") ? obj.Get("dt").As<Napi::Number>().DoubleValue() : 0.1;
    pop_params.t_max = obj.Has("t_max") ? obj.Get("t_max").As<Napi::Number>().Int32Value() : 30;
    
    pop_params.vaccination_proportion = obj.Get("vaccination_proportion").As<Napi::Number>().DoubleValue();
    pop_params.age_mean = obj.Get("age_mean").As<Napi::Number>().DoubleValue();
    pop_params.age_sd = obj.Get("age_sd").As<Napi::Number>().DoubleValue();
    pop_params.t_psi_shape = obj.Get("t_psi_shape").As<Napi::Number>().DoubleValue();
    pop_params.t_psi_rate = obj.Get("t_psi_rate").As<Napi::Number>().DoubleValue();
    pop_params.t_psi_max = obj.Get("t_psi_max").As<Napi::Number>().DoubleValue();

    // 1. Run Control Arm
    pop_params.sample_size = control_n;
    pop_params.is_control = true;
    std::vector<IndividualResults> control_pop;
    ModelPopulation(pop_params, control_pop);

    Napi::Array jsControlVL = Napi::Array::New(env, control_pop.size());
    for (size_t i = 0; i < control_pop.size(); ++i) {
        // Evaluate at standard endpoint or patient-specific endpoint
        double vl = control_pop[i].log10V.empty() ? 0.0 : control_pop[i].log10V.back();
        jsControlVL.Set(i, Napi::Number::New(env, vl));
    }

    // 2. Run Treated Arm
    pop_params.sample_size = treated_n;
    pop_params.is_control = false;
    std::vector<IndividualResults> treated_pop;
    ModelPopulation(pop_params, treated_pop);

    Napi::Array jsTreatedVL = Napi::Array::New(env, treated_pop.size());
    for (size_t i = 0; i < treated_pop.size(); ++i) {
        double vl = treated_pop[i].log10V.empty() ? 0.0 : treated_pop[i].log10V.back();
        jsTreatedVL.Set(i, Napi::Number::New(env, vl));
    }

    Napi::Object response = Napi::Object::New(env);
    response.Set("control", jsControlVL);
    response.Set("treated", jsTreatedVL);
    return response;
}

// Module initialization
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(
        Napi::String::New(env, "modelIndividual"),
        Napi::Function::New(env, ModelIndividualWrapped)
    );

    exports.Set(
        Napi::String::New(env, "modelPopulation"),
        Napi::Function::New(env, ModelPopulationWrapped)
    );

    return exports;
}

NODE_API_MODULE(simulation_addon, Init)