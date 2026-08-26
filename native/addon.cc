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
    IndividualParamaters params = ParseIndividualParams(inputParams);

    std::vector<IndividualResults> results;
    ModelIndividual(params, results);

    // Convert vector<IndividualResults> to Napi::Array
    Napi::Array jsResults = Napi::Array::New(env, results.size());
    for (size_t i = 0; i < results.size(); ++i) {
        Napi::Object entry = Napi::Object::New(env);
        entry.Set("t", Napi::Number::New(env, results[i].t));
        entry.Set("log10V", Napi::Number::New(env, results[i].log10V));
        entry.Set("C_P_uM", Napi::Number::New(env, results[i].C_P_uM));
        entry.Set("epsilon", Napi::Number::New(env, results[i].epsilon));
        jsResults[i] = entry;
    }

    return jsResults;
}

// Module initialization
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set(
        Napi::String::New(env, "modelIndividual"),
        Napi::Function::New(env, ModelIndividualWrapped)
    );
    return exports;
}

NODE_API_MODULE(simulation_addon, Init)