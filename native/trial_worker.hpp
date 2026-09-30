#pragma once

#include <napi.h>
#include <vector>
#include <omp.h>
#include "models.hpp"
#include <iostream>
#include <chrono>

#include "ancova_analysis.hpp"
#include "auc_analysis.hpp"

class TrialWorker : public Napi::AsyncWorker {
public:
    TrialWorker(Napi::Env env, PopulationParamaters pop_params, 
        int runs, int control_n, int treated_n)
        : Napi::AsyncWorker(env),
          pop_params_(pop_params),
          runs_(runs),
          control_n_(control_n),
          treated_n_(treated_n),
          deferred_(Napi::Promise::Deferred::New(env)) {}

    Napi::Promise GetPromise() {
        return deferred_.Promise();
    }

protected:
    // Runs on a background libuv worker thread (NO Napi calls allowed here)
    void Execute() override {
        // Pre-allocate space so threads write to index [r]
        control_runs_.resize(runs_);
        treated_runs_.resize(runs_);

        day3_ancova_results_.resize(runs_);
        day5_ancova_results_.resize(runs_);
        log10V_change_ancova_results_.resize(runs_);
        auc_results_.resize(runs_);

        #pragma omp parallel for schedule(dynamic)
        for (int r = 0; r < runs_; ++r) {
            // 1. Run Control Group
            PopulationParamaters control_params = pop_params_;
            control_params.sample_size = control_n_;
            control_params.is_control = true;
            ModelPopulation(control_params, control_runs_[r]);

            // 2. Run Treated Group
            PopulationParamaters treated_params = pop_params_;
            treated_params.sample_size = treated_n_;
            treated_params.is_control = false;
            ModelPopulation(treated_params, treated_runs_[r]);

            // 3. Run ANCOVA Analysis on viral load at Day 3 and Day 5 (RECOVERY)
            day3_ancova_results_[r] = AnalyseEndpoint(control_runs_[r], treated_runs_[r], 2);
            day5_ancova_results_[r] = AnalyseEndpoint(control_runs_[r], treated_runs_[r], 4);

            // 4. Run ANCOVA Analysis on change in viral load after randomisation (EPIC-HR)
            log10V_change_ancova_results_[r] = AnalyseChangeFromBaseline(control_runs_[r], treated_runs_[r]);

            // 5. Run AUC Analysis on viral load
            auc_results_[r] = AnalyseAUC(control_runs_[r], treated_runs_[r], 5);
        }
    }

    // Runs back on the main Node.js thread — safe to create JS objects
    void OnOK() override {
        Napi::Env env = Env();
        Napi::HandleScope scope(env);

        auto toJsArray = [&](const std::vector<AncovaResult>& results) {
            Napi::Array arr = Napi::Array::New(env, results.size());
            for (size_t i = 0; i < results.size(); ++i) {
                const AncovaResult& r = results[i];
                Napi::Object obj = Napi::Object::New(env);
                obj.Set("n", Napi::Number::New(env, r.n));
                obj.Set("df_residual", Napi::Number::New(env, r.df_residual));
                obj.Set("mean_control", Napi::Number::New(env, r.mean_control));
                obj.Set("mean_treatment", Napi::Number::New(env, r.mean_treatment));
                obj.Set("diff", Napi::Number::New(env, r.diff));
                obj.Set("se_diff", Napi::Number::New(env, r.se_diff));
                obj.Set("p_value", Napi::Number::New(env, r.p_value));
                obj.Set("significant", Napi::Boolean::New(env, r.significant));
                obj.Set("valid", Napi::Boolean::New(env, r.valid));
                arr.Set(i, obj);
            }
            return arr;
        };

        auto toJsAucArray = [&](const std::vector<AucResult>& results) {
            Napi::Array arr = Napi::Array::New(env, results.size());
            for (size_t i = 0; i < results.size(); ++i) {
                const AucResult& r = results[i];
                Napi::Object obj = Napi::Object::New(env);
                obj.Set("mean_control", Napi::Number::New(env, r.mean_control));
                obj.Set("mean_treatment", Napi::Number::New(env, r.mean_treatment));
                obj.Set("p_value", Napi::Number::New(env, r.p_value));
                obj.Set("significant", Napi::Boolean::New(env, r.significant));
                arr.Set(i, obj);
            }
            return arr;
        };

        Napi::Object response = Napi::Object::New(env);
        response.Set("runs", Napi::Number::New(env, runs_));
        response.Set("day3", toJsArray(day3_ancova_results_));
        response.Set("day5", toJsArray(day5_ancova_results_));
        response.Set("change", toJsArray(log10V_change_ancova_results_));
        response.Set("auc", toJsAucArray(auc_results_));

        deferred_.Resolve(response);
    }

    void OnError(const Napi::Error& e) override {
        deferred_.Reject(e.Value());
    }

private:
    PopulationParamaters pop_params_;
    int runs_;
    int control_n_;
    int treated_n_;

    std::vector<std::vector<IndividualResults>> control_runs_;
    std::vector<std::vector<IndividualResults>> treated_runs_;

    std::vector<AncovaResult> day3_ancova_results_;
    std::vector<AncovaResult> day5_ancova_results_;

    std::vector<AncovaResult> log10V_change_ancova_results_;

    std::vector<AucResult> auc_results_;

    Napi::Promise::Deferred deferred_;
};