#include <napi.h>
#include <vector>
#include "models.hpp"
#include "trial_worker.hpp"
#include <iostream>

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

    Napi::Array jsTreated = Napi::Array::New(env, treated_results.log10V.size());
    for (size_t i = 0; i < treated_results.log10V.size(); ++i) {
        Napi::Object entry = Napi::Object::New(env);
        entry.Set("t", Napi::Number::New(env, i * treated_results.dt));
        entry.Set("log10V", Napi::Number::New(env, treated_results.log10V[i]));
        entry.Set("C_P_uM", Napi::Number::New(env, treated_results.C_P_uM[i]));
        entry.Set("log10V_observed", Napi::Number::New(env, treated_results.log10V_observed[i]));
        jsTreated.Set(i, entry);
    }

    // 2. Run Control Model
    IndividualParamaters control_params = treated_params;
    control_params.is_control = true;
    
    IndividualResults control_results;
    ModelIndividual(control_params, control_results);

    Napi::Array jsControl = Napi::Array::New(env, control_results.log10V.size());
    for (size_t i = 0; i < control_results.log10V.size(); ++i) {
        Napi::Object entry = Napi::Object::New(env);
        entry.Set("t", Napi::Number::New(env, i * control_results.dt));
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

PopulationParamaters ParsesPopulationParams(const Napi::Object& obj) {
    PopulationParamaters pop_params;

    if (obj.Has("treatment_sample_size")) pop_params.sample_size = obj.Get("treatment_sample_size").As<Napi::Number>().Int32Value();
    
    if (obj.Has("dose")) pop_params.dose = obj.Get("dose").As<Napi::Number>().Int32Value();
    if (obj.Has("dosing_duration")) pop_params.dosing_duration = obj.Get("dosing_duration").As<Napi::Number>().Int32Value();
    if (obj.Has("dt")) pop_params.dt = obj.Get("dt").As<Napi::Number>().DoubleValue();
    if (obj.Has("t_max")) pop_params.t_max = obj.Get("t_max").As<Napi::Number>().Int32Value();
    
    if (obj.Has("vaccination_proportion")) pop_params.vaccination_proportion = obj.Get("vaccination_proportion").As<Napi::Number>().DoubleValue();
    if (obj.Has("age_mean")) pop_params.age_mean = obj.Get("age_mean").As<Napi::Number>().DoubleValue();
    if (obj.Has("age_sd")) pop_params.age_sd = obj.Get("age_sd").As<Napi::Number>().DoubleValue();
    if (obj.Has("t_psi_shape")) pop_params.t_psi_shape = obj.Get("t_psi_shape").As<Napi::Number>().DoubleValue();
    if (obj.Has("t_psi_rate")) pop_params.t_psi_rate = obj.Get("t_psi_rate").As<Napi::Number>().DoubleValue();
    if (obj.Has("t_psi_max")) pop_params.t_psi_max = obj.Get("t_psi_max").As<Napi::Number>().DoubleValue();

    return pop_params;
}

Napi::Value ModelPopulationWrapped(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();

    if (info.Length() < 1 || !info[0].IsObject()) {
        Napi::TypeError::New(env, "Object expected for population parameters").ThrowAsJavaScriptException();
        return env.Null();
    }

    Napi::Object inputParams = info[0].As<Napi::Object>();
    PopulationParamaters pop_params = ParsesPopulationParams(inputParams);

    int control_n = inputParams.Get("control_sample_size").As<Napi::Number>().Int32Value();
    int treated_n = inputParams.Get("treatment_sample_size").As<Napi::Number>().Int32Value();

    // 1. Run Control 
    pop_params.sample_size = control_n;
    pop_params.is_control = true;
    std::vector<IndividualResults> control_pop;
    ModelPopulation(pop_params, control_pop);

    Napi::Array jsControlVL = Napi::Array::New(env, control_pop.size());
    for (size_t i = 0; i < control_pop.size(); ++i) {
        Napi::Array patientTrajectory = Napi::Array::New(env, control_pop[i].log10V.size());
        for (size_t j = 0; j < control_pop[i].log10V.size(); ++j) {
            patientTrajectory.Set(j, Napi::Number::New(env, control_pop[i].log10V[j]));
        }
        jsControlVL.Set(i, patientTrajectory);
    }

    // 2. Run Treated 
    pop_params.sample_size = treated_n;
    pop_params.is_control = false;
    std::vector<IndividualResults> treated_pop;
    ModelPopulation(pop_params, treated_pop);

    Napi::Array jsTreatedVL = Napi::Array::New(env, treated_pop.size());
    for (size_t i = 0; i < treated_pop.size(); ++i) {
        Napi::Array patientTrajectory = Napi::Array::New(env, treated_pop[i].log10V.size());
        for (size_t j = 0; j < treated_pop[i].log10V.size(); ++j) {
            patientTrajectory.Set(j, Napi::Number::New(env, treated_pop[i].log10V[j]));
        }
        jsTreatedVL.Set(i, patientTrajectory);
    }

    Napi::Object response = Napi::Object::New(env);
    response.Set("control", jsControlVL);
    response.Set("treated", jsTreatedVL);
    return response;
}

Napi::Value ModelTrialWrapped(const Napi::CallbackInfo& info){
    Napi::Env env = info.Env();
    Napi::Object inputParams = info[0].As<Napi::Object>();
    PopulationParamaters pop_params = ParsesPopulationParams(inputParams);

    int runs = inputParams.Get("runs").As<Napi::Number>().Int32Value();
    int control_n = inputParams.Get("control_sample_size").As<Napi::Number>().Int32Value();
    int treated_n = inputParams.Get("treatment_sample_size").As<Napi::Number>().Int32Value();

    auto* worker = new TrialWorker(env, pop_params, runs, control_n, treated_n);
    auto promise = worker->GetPromise();
    worker->Queue();

    return promise;
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

    exports.Set(
        Napi::String::New(env, "modelTrial"),
        Napi::Function::New(env, ModelTrialWrapped)
    );

    return exports;
}

NODE_API_MODULE(simulation_addon, Init)