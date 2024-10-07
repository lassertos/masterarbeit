#include <napi.h>
#include <sim_avr.h>
#include <sim_core_decl.h>

#include "simulation.h"

Napi::Value listCores(const Napi::CallbackInfo &info)
{
  Napi::Array result = Napi::Array::New(info.Env());

  int current_index = 0;
  for (int i = 0; avr_kind[i]; i++)
  {
    for (int ti = 0; ti < 4 && avr_kind[i]->names[ti]; ti++)
    {
      Napi::String name = Napi::String::New(info.Env(), avr_kind[i]->names[ti]);
      result[current_index++] = name;
    }
  }

  return result;
}

Napi::Object init(Napi::Env env, Napi::Object exports)
{
  exports.Set(Napi::String::New(env, "listCores"), Napi::Function::New<listCores>(env));
  Simulation::Init(env, exports);
  return exports;
}

NODE_API_MODULE(NODE_GYP_MODULE_NAME, init)