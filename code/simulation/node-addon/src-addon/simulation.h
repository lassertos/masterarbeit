#include <sim_avr.h>
#include <napi.h>
#include <thread>
#include <map>
#include <string>
#include <queue>

typedef enum
{
    CREATED,
    PROGRAMMED,
    RUNNING,
    STOPPED
} simulation_status;

typedef struct
{
    char port;
    char index;
    uint32_t value;
} pin_event;

class Simulation : public Napi::ObjectWrap<Simulation>
{
private:
    avr_t *avr;
    std::thread thread;
    bool stop_thread;
    std::queue<pin_event> pin_events;
    simulation_status status;

protected:
    std::map<std::string, Napi::ThreadSafeFunction> pin_callbacks;

public:
    static Napi::Object Init(Napi::Env env, Napi::Object exports);
    Simulation(const Napi::CallbackInfo &info);
    void load(const Napi::CallbackInfo &info);
    void start(const Napi::CallbackInfo &info);
    void stop(const Napi::CallbackInfo &info);
    void setPinValue(const Napi::CallbackInfo &info);
    Napi::Value getPinValue(const Napi::CallbackInfo &info);
    Napi::Value listPins(const Napi::CallbackInfo &info);
    void registerPinCallback(const Napi::CallbackInfo &info);
    Napi::Value getStatus(const Napi::CallbackInfo &info);
};