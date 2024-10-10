import { DeviceHandler } from "@crosslab-ide/soa-client";
import { configuration } from "./configuration.mjs";
import {
  ElectricalConnectionService,
  GPIO,
} from "@crosslab-ide/soa-service-electrical";
import { Simulation } from "@crosslab-ide/simavr-node-addon";
import { FileService__Consumer } from "@crosslab-ide/soa-service-file";
import fs, { stat } from "fs";

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

    const gpioService = new ElectricalConnectionService("gpios", [
      ...this._simulation.listPins(),
      "active",
    ]);
    const gpioInterface = new GPIO.ConstructableGPIOInterface([
      ...this._simulation.listPins(),
      "active",
    ]);
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

    const fileService = new FileService__Consumer("program");

    fileService.on("file", (event) => {
      const folderPath =
        "/tmp/" + Buffer.from(this._instanceUrl).toString("base64");
      const filePath = `${folderPath}/program.elf`;

      if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
      }

      fs.writeFile(filePath, event.file, () => {
        if (this._simulation.status === "running") {
          this._simulation.stop();
        }
        this._simulation.load(filePath);
        this._simulation.start();
      });
    });

    this._deviceHandler.addService(gpioService);
    this._deviceHandler.addService(fileService);

    this._deviceHandler.on("experimentStatusChanged", (event) => {
      console.log(
        "experiment/simulation status:",
        event.status,
        this._simulation.status
      );
      if (
        event.status === "finished" &&
        this._simulation.status === "running"
      ) {
        console.log("stopping simulation!");
        this._simulation.stop();
      }
    });

    this._deviceHandler.on("connectionsChanged", () => {
      for (const connection of this._deviceHandler.connections.values()) {
        if (
          connection.state === "failed" ||
          connection.state === "closed" ||
          connection.state === "disconnected"
        ) {
          connection.teardown();
          if (this._simulation.status === "running") {
            console.log("stopping simulation!");
            this._simulation.stop();
          }
        }
      }
    });
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
