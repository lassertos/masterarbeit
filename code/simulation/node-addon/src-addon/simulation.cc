#include <napi.h>
#include <sim_avr.h>
#include <sim_elf.h>
#include <avr_ioport.h>
#include <sim_gdb.h>
#include <thread>
#include <chrono>
#include <algorithm>
#include <iostream>

#include "simulation.h"
#include "helper.h"

Napi::Object Simulation::Init(Napi::Env env, Napi::Object exports)
{
	Napi::Function func = DefineClass(
		env,
		"Simulation",
		{
			InstanceMethod<&Simulation::load>("load", static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
			InstanceMethod<&Simulation::start>("start", static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
			InstanceMethod<&Simulation::stop>("stop", static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
			InstanceMethod<&Simulation::setPinValue>("setPinValue", static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
			InstanceMethod<&Simulation::getPinValue>("getPinValue", static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
			InstanceMethod<&Simulation::listPins>("listPins", static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
			InstanceMethod<&Simulation::registerPinCallback>("registerPinCallback", static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
			InstanceMethod<&Simulation::startDebugging>("startDebugging", static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
			InstanceMethod<&Simulation::endDebugging>("endDebugging", static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
			InstanceMethod<&Simulation::terminate>("terminate", static_cast<napi_property_attributes>(napi_writable | napi_configurable)),
			InstanceAccessor<&Simulation::getStatus>("status"),
		});

	Napi::FunctionReference *constructor = new Napi::FunctionReference();

	*constructor = Napi::Persistent(func);
	exports.Set("Simulation", func);

	env.SetInstanceData<Napi::FunctionReference>(constructor);

	return exports;
}

Simulation::Simulation(const Napi::CallbackInfo &info) : Napi::ObjectWrap<Simulation>(info)
{
	if (info.Length() != 1)
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Expected at one argument!");
		error.ThrowAsJavaScriptException();
	}

	if (!info[0].IsString())
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Expected first argument to be a string!");
		error.ThrowAsJavaScriptException();
	}

	Napi::String core = info[0].As<Napi::String>();

	this->status = CREATED;
	this->stop_thread = false;
	this->avr = avr_make_mcu_by_name(core.Utf8Value().c_str());
	if (!avr)
	{
		// TODO: error handling
	}
	avr_init(avr);
}

void Simulation::load(const Napi::CallbackInfo &info)
{
	if (info.Length() != 1)
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Expected one argument!");
		error.ThrowAsJavaScriptException();
	}

	if (!info[0].IsString())
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Expected first argument to be a string!");
		error.ThrowAsJavaScriptException();
	}

	Napi::String elf_file_path = info[0].As<Napi::String>();

	elf_firmware_t elf_firmware = {{0}};

	elf_read_firmware(elf_file_path.Utf8Value().c_str(), &elf_firmware);

	avr_load_firmware(this->avr, &elf_firmware);

	this->status = PROGRAMMED;
}

void run(avr_t *avr, bool *stop_thread, std::queue<pin_event> *pin_events)
{
	if (avr->state == cpu_Stopped)
	{
		printf("CPU is currently stopped!\n");
	}

	while (!(*stop_thread))
	{
		while (!pin_events->empty())
		{
			pin_event event = pin_events->front();
			pin_events->pop();
			avr_raise_irq(
				avr_io_getirq(
					avr,
					AVR_IOCTL_IOPORT_GETIRQ(event.port),
					event.index),
				event.value);
		}

		int state = avr_run(avr);

		if (state == cpu_Done || state == cpu_Crashed)
			break;
	}

	printf("Left the simulation run loop!\n");
}

void Simulation::start(const Napi::CallbackInfo &info)
{
	printf("Starting the simulation! %d\n", this->status);
	if (this->status == RUNNING)
	{
		return;
	}
	this->status = RUNNING;
	this->stop_thread = false;
	this->thread = std::thread(&run, this->avr, &this->stop_thread, &this->pin_events);
}

void Simulation::stop(const Napi::CallbackInfo &info)
{
	printf("Stopping the simulation!\n");
	if (this->status != RUNNING)
	{
		return;
	}
	this->status = STOPPED;
	this->stop_thread = true;
	this->thread.join();
	avr_reset(this->avr);

	Napi::Value value = this->listPins(info);
	Napi::Array pins = value.As<Napi::Array>();

	std::queue<pin_event> pin_events;
	for (int i = 0; i < pins.Length(); i++)
	{
		char port = pins.Get(i).As<Napi::String>().Utf8Value()[0];
		char index = pins.Get(i).As<Napi::String>().Utf8Value()[1] - 48;

		pin_event event = {.port = port, .index = index, .value = 0};
		pin_events.push(event);
	}

	while (!pin_events.empty())
	{
		pin_event event = pin_events.front();
		pin_events.pop();
		avr_raise_irq(
			avr_io_getirq(
				avr,
				AVR_IOCTL_IOPORT_GETIRQ(event.port),
				event.index),
			event.value);
	}
}

void Simulation::setPinValue(const Napi::CallbackInfo &info)
{
	if (info.Length() != 2)
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Expected two arguments!");
		error.ThrowAsJavaScriptException();
	}

	if (!info[0].IsString())
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Expected first argument to be a string!");
		error.ThrowAsJavaScriptException();
	}

	if (!info[1].IsNumber())
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Expected third argument to be a number!");
		error.ThrowAsJavaScriptException();
	}

	Napi::Array pins = this->listPins(info).As<Napi::Array>();

	bool pin_found = false;
	for (uint32_t i = 0; i < pins.Length(); i++)
	{
		if (pins.Get(i) == info[0])
		{
			pin_found = true;
			break;
		}
	}

	if (!pin_found)
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Given pin is not a valid pin!");
		error.ThrowAsJavaScriptException();
	}

	char port = info[0].As<Napi::String>().Utf8Value()[0];
	char index = info[0].As<Napi::String>().Utf8Value()[1] - 48;

	Napi::Number value = info[1].As<Napi::Number>();

	pin_event event = {.port = port, .index = index, .value = value};
	this->pin_events.push(event);
}

Napi::Value Simulation::getPinValue(const Napi::CallbackInfo &info)
{
	if (info.Length() != 1)
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Expected one argument!");
		error.ThrowAsJavaScriptException();
	}

	if (!info[0].IsString())
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Expected first argument to be a string!");
		error.ThrowAsJavaScriptException();
	}

	Napi::Array pins = this->listPins(info).As<Napi::Array>();

	bool pin_found = false;
	for (uint32_t i = 0; i < pins.Length(); i++)
	{
		if (pins.Get(i) == info[0])
		{
			pin_found = true;
			break;
		}
	}

	if (!pin_found)
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Given pin is not a valid pin!");
		error.ThrowAsJavaScriptException();
	}

	char port = info[0].As<Napi::String>().Utf8Value()[0];
	char index = info[0].As<Napi::String>().Utf8Value()[1] - 48;

	return Napi::Number::New(
		info.Env(),
		avr_io_getirq(
			this->avr,
			AVR_IOCTL_IOPORT_GETIRQ(port),
			index)
			->value);
}

Napi::Value Simulation::listPins(const Napi::CallbackInfo &info)
{
	Napi::Array result = Napi::Array::New(info.Env());

	avr_io_t *port = this->avr->io_port;

	int current_index = 0;
	while (port)
	{
		for (int i = 0; i < port->irq_count; i++)
		{
			if (!strcmp(port->kind, "port"))
			{
				size_t length = strlen(port->irq[i].name);
				bool ends_with_number = false;
				for (int j = 48; j < 58; j++)
				{
					if (port->irq[i].name[length - 1] == j)
					{
						ends_with_number = true;
						break;
					}
				}
				if (!ends_with_number)
				{
					break;
				}
				std::vector<std::string> split_string = split(port->irq[i].name, ".");
				std::string port_name = split_string[1].substr(split_string[1].length() - 1);
				port_name[0] = toupper(port_name[0]);
				std::string pin_number = split_string[2].substr(split_string[2].length() - 1);
				result[current_index++] = Napi::String::New(info.Env(), port_name + pin_number);
			}
		}
		port = port->next;
	}

	return result;
}

void Simulation::registerPinCallback(const Napi::CallbackInfo &info)
{
	if (info.Length() != 2)
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Expected two arguments!");
		error.ThrowAsJavaScriptException();
	}

	if (!info[0].IsString())
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Expected first argument to be a string!");
		error.ThrowAsJavaScriptException();
	}

	if (!info[1].IsFunction())
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Expected second argument to be a function!");
		error.ThrowAsJavaScriptException();
	}

	Napi::Array pins = this->listPins(info).As<Napi::Array>();

	bool pin_found = false;
	for (uint32_t i = 0; i < pins.Length(); i++)
	{
		if (pins.Get(i) == info[0])
		{
			pin_found = true;
			break;
		}
	}

	if (!pin_found)
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Given pin is not a valid pin!");
		error.ThrowAsJavaScriptException();
	}

	char port = info[0].As<Napi::String>().Utf8Value()[0];
	char index = info[0].As<Napi::String>().Utf8Value()[1] - 48;
	Napi::Function callback = info[1].As<Napi::Function>();

	avr_irq_t *irq = avr_io_getirq(
		this->avr,
		AVR_IOCTL_IOPORT_GETIRQ(port),
		index);
	Napi::ThreadSafeFunction pin_callback = Napi::ThreadSafeFunction::New(
		info.Env(),
		callback,
		irq->name,
		0,
		1,
		[](Napi::Env) {});

	this->pin_callbacks[irq->name] = pin_callback;

	auto pin_changed_hook = [](struct avr_irq_t *irq, uint32_t value, void *param)
	{
		Simulation *simulation = (Simulation *)param;
		Napi::ThreadSafeFunction pin_callback = simulation->pin_callbacks[irq->name];

		auto callback = [](Napi::Env env, Napi::Function jsCallback, int *value)
		{
			jsCallback.Call({Napi::Number::New(env, *value)});
			delete value;
		};

		int *val = new int(value);
		pin_callback.BlockingCall(val, callback);
	};

	avr_irq_register_notify(
		irq,
		pin_changed_hook,
		this);
}

Napi::Value Simulation::getStatus(const Napi::CallbackInfo &info)
{
	if (this->status == CREATED)
		return Napi::String::New(info.Env(), "created");
	if (this->status == PROGRAMMED)
		return Napi::String::New(info.Env(), "programmed");
	if (this->status == RUNNING)
		return Napi::String::New(info.Env(), "running");
	if (this->status == STOPPED)
		return Napi::String::New(info.Env(), "stopped");
	if (this->status == TERMINATED)
		return Napi::String::New(info.Env(), "terminated");

	return info.Env().Null();
}

void Simulation::startDebugging(const Napi::CallbackInfo &info)
{
	if (info.Length() != 1)
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Expected one argument!");
		error.ThrowAsJavaScriptException();
	}

	if (!info[0].IsNumber())
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Expected first argument to be a number!");
		error.ThrowAsJavaScriptException();
	}

	Napi::Number port = info[0].As<Napi::Number>();

	if (this->avr->gdb)
	{
		Napi::Error error = Napi::Error::New(info.Env(), "Simulation is already being debugged!");
		error.ThrowAsJavaScriptException();
	}

	this->avr->gdb_port = port.Uint32Value();

	this->avr->state = cpu_Stopped;
	avr_gdb_init(this->avr);
}

void Simulation::endDebugging(const Napi::CallbackInfo &info)
{
	if (!this->avr->gdb)
		return;

	avr_deinit_gdb(this->avr);

	this->avr->state = cpu_Running;
}

void Simulation::terminate(const Napi::CallbackInfo &info)
{
	if (this->status == RUNNING)
	{
		this->stop(info);
	}

	avr_terminate(this->avr);

	this->status = TERMINATED;
}