import { DeviceHandler } from "@cross-lab-project/soa-client";
import { configuration } from "./configuration.mjs";
import {
  ElectricalConnectionService,
  GPIO,
} from "@cross-lab-project/soa-service-electrical";
import { Simulation } from "@crosslab-ide/simavr-node-addon";

export class SimavrInstance {
  private _deviceHandler: DeviceHandler;
  private _simulation: Simulation;
  private _instanceUrl: string;
  private _deviceToken: string;

  constructor(instanceUrl: string, deviceToken: string) {
    this._instanceUrl = instanceUrl;
    this._deviceToken = deviceToken;

    this._simulation = new Simulation("atmega2560");

    this._deviceHandler = new DeviceHandler();

    const gpioService = new ElectricalConnectionService(
      "gpio",
      this._simulation.listPins()
    );
    const gpioInterface = new GPIO.ConstructableGPIOInterface(
      this._simulation.listPins()
    );
    gpioService.addInterface(gpioInterface);

    gpioService.on("newInterface", (event) => {
      if (event.connectionInterface.interfaceType === "gpio") {
        const connectionInterface =
          event.connectionInterface as GPIO.GPIOInterface;
        if (
          connectionInterface.configuration.direction === "in" ||
          connectionInterface.configuration.direction === "inout"
        ) {
          connectionInterface.on("signalChange", (signalChangeEvent) => {
            this._simulation.setPinValue(
              connectionInterface.signal,
              signalChangeEvent.state === GPIO.GPIOState.StrongHigh ||
                signalChangeEvent.state === GPIO.GPIOState.WeakHigh
                ? 1
                : 0
            );
          });
          this._simulation.setPinValue(
            connectionInterface.signal,
            connectionInterface.signalState === GPIO.GPIOState.StrongHigh ||
              connectionInterface.signalState === GPIO.GPIOState.WeakHigh
              ? 1
              : 0
          );
        }
        if (
          connectionInterface.configuration.direction === "out" ||
          connectionInterface.configuration.direction === "inout"
        ) {
          this._simulation.registerPinCallback(
            connectionInterface.signal,
            (value) => {
              connectionInterface.changeDriver(
                value ? GPIO.GPIOState.StrongHigh : GPIO.GPIOState.StrongLow
              );
            }
          );
          connectionInterface.changeDriver(
            this._simulation.getPinValue(connectionInterface.signal)
              ? GPIO.GPIOState.StrongHigh
              : GPIO.GPIOState.StrongLow
          );
        }
      }
    });

    this._deviceHandler.addService(gpioService);
  }

  public async connect() {
    const response = await fetch(
      configuration.WEBSOCKET_ENDPOINT.replace(
        "/websocket",
        `/${this._instanceUrl.split("/").at(-1)}/websocket`
      ),
      {
        method: "POST",
        headers: [["authorization", `Bearer ${this._deviceToken}`]],
      }
    );
    const token = await response.json();
    await this._deviceHandler.connect({
      endpoint: configuration.WEBSOCKET_ENDPOINT,
      id: this._instanceUrl,
      token: token,
    });
  }
}
