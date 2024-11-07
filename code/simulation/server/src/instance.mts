import { DeviceHandler } from "@crosslab-ide/soa-client";
import { configuration } from "./configuration.mjs";
import {
  ElectricalConnectionService,
  GPIO,
} from "@crosslab-ide/soa-service-electrical";
import { Simulation } from "@crosslab-ide/simavr-node-addon";
import { FileService__Consumer } from "@crosslab-ide/soa-service-file";
import fs from "fs";
import fsPromises from "fs/promises";
import { DebuggingTargetServiceProducer } from "@crosslab-ide/crosslab-debugging-target-service";
import { getFreePort } from "./util.mjs";
import net from "net";
import { MessagingServiceProsumer } from "@crosslab-ide/messaging-service";

export class SimavrInstance {
  private _deviceHandler: DeviceHandler;
  private _simulation: Simulation;
  private _instanceUrl: string;
  private _deviceToken: string;
  private _isDebugging: boolean = false;
  private _gpioService: ElectricalConnectionService;
  private _fileServiceConsumer: FileService__Consumer;
  private _debuggingTargetServiceProducer: DebuggingTargetServiceProducer;
  private _messagingService: MessagingServiceProsumer;

  constructor(instanceUrl: string, deviceToken: string) {
    this._instanceUrl = instanceUrl;
    this._deviceToken = deviceToken;

    this._simulation = new Simulation("atmega2560");

    this._deviceHandler = new DeviceHandler();

    this._gpioService = new ElectricalConnectionService("gpios", [
      ...this._simulation.listPins(),
      ...this._simulation.listPins().map((pin) => `${pin}-debug`),
      "active",
    ]);
    const gpioInterface = new GPIO.ConstructableGPIOInterface([
      ...this._simulation.listPins(),
      ...this._simulation.listPins().map((pin) => `${pin}-debug`),
      "active",
    ]);
    this._gpioService.addInterface(gpioInterface);

    this._gpioService.on("newInterface", (event) => {
      if (event.connectionInterface.interfaceType === "gpio") {
        const connectionInterface =
          event.connectionInterface as GPIO.GPIOInterface;
        const signal = connectionInterface.signal.endsWith("-debug")
          ? connectionInterface.signal.replace("-debug", "")
          : connectionInterface.signal;
        if (
          connectionInterface.configuration.direction === "in" ||
          connectionInterface.configuration.direction === "inout"
        ) {
          connectionInterface.on("signalChange", (signalChangeEvent) => {
            this._simulation.setPinValue(
              signal,
              signalChangeEvent.state === GPIO.GPIOState.StrongHigh ||
                signalChangeEvent.state === GPIO.GPIOState.WeakHigh
                ? 1
                : 0
            );
          });
          this._simulation.setPinValue(
            signal,
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
          this._simulation.registerPinCallback(signal, (value) => {
            connectionInterface.changeDriver(
              value ? GPIO.GPIOState.StrongHigh : GPIO.GPIOState.StrongLow
            );
          });
          connectionInterface.changeDriver(
            this._simulation.getPinValue(signal)
              ? GPIO.GPIOState.StrongHigh
              : GPIO.GPIOState.StrongLow
          );
        }
      }
    });

    this._messagingService = new MessagingServiceProsumer(
      "messaging",
      undefined,
      undefined
    );

    this._debuggingTargetServiceProducer = new DebuggingTargetServiceProducer(
      "debugging-target"
    );

    this._debuggingTargetServiceProducer.on(
      "debugging:start",
      async (requestId, program) => {
        console.log("starting debugging");
        try {
          const port = await getFreePort({ start: 3000 });
          if (!port) {
            throw Error("No available port found!");
          }
          console.log(`Found free port: ${port}`);
          await this._program(program);
          console.log("Programmed successfully");
          this._simulation.startDebugging(port);
          console.log("Debugging started");
          this._simulation.start();
          console.log("Simulation started");
          const socket = net.connect(port, undefined, () => {
            console.log("Socket connected");
            this._messagingService.on("message", (message) => {
              if (message.content instanceof Uint8Array) {
                socket.write(message.content);
              }
            });
            this._debuggingTargetServiceProducer.send({
              type: "debugging:start:response",
              content: {
                requestId,
                success: true,
                message: "Debugging started successfully",
              },
            });
          });
          socket.on("data", async (data) => {
            console.log("Socket received data:", data);
            await this._messagingService.send({
              type: "debugging:message",
              content: data,
            });
          });
          socket.on("error", (error) => {
            // TODO: more errorhandling necessary?
            console.error(error);
          });
        } catch (error) {
          this._debuggingTargetServiceProducer.send({
            type: "debugging:start:response",
            content: {
              requestId,
              success: false,
              message:
                error instanceof Error
                  ? error.message
                  : "Something went wrong while trying to start debugging!",
            },
          });
        }
      }
    );

    this._debuggingTargetServiceProducer.on("debugging:end", (requestId) => {
      try {
        this._simulation.endDebugging();

        this._debuggingTargetServiceProducer.send({
          type: "debugging:end:response",
          content: {
            requestId,
            success: true,
            message: "Debugging ended successfully",
          },
        });
      } catch (error) {
        this._debuggingTargetServiceProducer.send({
          type: "debugging:end:response",
          content: {
            requestId,
            success: false,
            message:
              error instanceof Error
                ? error.message
                : "Something went wrong while trying to end debugging!",
          },
        });
      }
    });

    this._fileServiceConsumer = new FileService__Consumer("program");

    this._fileServiceConsumer.on("file", async (event) => {
      console.log("received file:", event);
      await this._program(event.file);
      this._simulation.start();
    });

    this._deviceHandler.addService(this._gpioService);
    this._deviceHandler.addService(this._debuggingTargetServiceProducer);
    this._deviceHandler.addService(this._fileServiceConsumer);
    this._deviceHandler.addService(this._messagingService);

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

  private async _program(program: Uint8Array) {
    const folderPath =
      "/tmp/" + Buffer.from(this._instanceUrl).toString("base64");
    const filePath = `${folderPath}/program.elf`;

    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath);
    }

    await fsPromises.writeFile(filePath, program);

    if (this._simulation.status === "running") {
      this._simulation.stop();
    }
    this._simulation.load(filePath);
    this._gpioService.interfaces.forEach((connectionInterface) => {
      if (connectionInterface.interfaceType !== "gpio") {
        return;
      }

      const gpioInterface = connectionInterface as GPIO.GPIOInterface;

      if (
        gpioInterface.configuration.direction === "in" ||
        gpioInterface.configuration.direction === "inout"
      ) {
        this._simulation.setPinValue(
          gpioInterface.signal,
          gpioInterface.signalState === GPIO.GPIOState.WeakHigh ||
            gpioInterface.signalState === GPIO.GPIOState.StrongHigh
            ? 1
            : 0
        );
      }
    });
  }
}
