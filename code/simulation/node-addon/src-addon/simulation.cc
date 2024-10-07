#include <napi.h>
#include <sim_avr.h>
#include <sim_elf.h>
#include <avr_ioport.h>
#include <thread>
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
}

void run(avr_t *avr, bool *stop_thread, std::queue<pin_event> *pin_events)
{
	while (!(*stop_thread))
	{
		if (pin_events->size() > 0)
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
		avr_run(avr);
	}
}

void Simulation::start(const Napi::CallbackInfo &info)
{
	this->stop_thread = false;
	this->thread = std::thread(&run, this->avr, &this->stop_thread, &this->pin_events);
}

void Simulation::stop(const Napi::CallbackInfo &info)
{
	this->stop_thread = true;
	this->thread.join();
	this->thread.~thread();

	for (auto const &[key, val] : this->pin_callbacks)
	{
		val.Release();
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