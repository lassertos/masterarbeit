import { DeviceHandler } from "@crosslab-ide/soa-client";
import { configuration } from "./configuration.mjs";
import {
  ElectricalConnectionService,
  GPIO,
} from "@crosslab-ide/soa-service-electrical";
import { Simulation } from "@crosslab-ide/simavr-node-addon";
import fs from "fs";
import fsPromises from "fs/promises";
import { DebuggingTargetServiceProducer } from "@crosslab-ide/crosslab-debugging-target-service";
import { getFreePort } from "./util.mjs";
import net from "net";
import { MessagingServiceProsumer } from "@crosslab-ide/messaging-service";
import { TestingServiceProducer } from "@crosslab-ide/crosslab-testing-service";
import { ProgrammingServiceProducer } from "@crosslab-ide/crosslab-programming-service";

export class SimavrInstance {
  private _deviceHandler: DeviceHandler;
  private _simulation: Simulation;
  private _instanceUrl: string;
  private _deviceToken: string;
  private _gpioService: ElectricalConnectionService;
  private _programmingServiceProducer: ProgrammingServiceProducer;
  private _debuggingTargetServiceProducer: DebuggingTargetServiceProducer;
  private _messagingService: MessagingServiceProsumer;
  private _testingServiceProducer: TestingServiceProducer;
  private _currentProgram?: Uint8Array;

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

    this._programmingServiceProducer = new ProgrammingServiceProducer(
      "programming"
    );

    this._programmingServiceProducer.on(
      "program:request",
      async (consumerId, requestId, program) => {
        console.log("received program:", program);
        if (program.type !== "file") {
          return await this._programmingServiceProducer.send(consumerId, {
            type: "program:response",
            content: {
              requestId,
              success: false,
              message: "Expected an elf-file but got a directory!",
            },
          });
        }
        await this._program(program.content);
        this._simulation.start();
      }
    );

    this._testingServiceProducer = new TestingServiceProducer("testing");

    this._testingServiceProducer.registerFunction("stop", [], undefined, () => {
      this._simulation.stop();
    });

    this._testingServiceProducer.registerFunction(
      "start",
      [],
      undefined,
      () => {
        this._simulation.start();
      }
    );

    this._testingServiceProducer.registerFunction(
      "setPinValue",
      [
        {
          type: "string",
        } as const,
        {
          type: "number",
        } as const,
      ] as const,
      undefined,
      (pin, value) => {
        this._simulation.setPinValue(pin, value);
      }
    );

    this._testingServiceProducer.registerFunction(
      "getPinValue",
      [
        {
          type: "string",
        } as const,
      ] as const,
      {
        type: "number",
      } as const,
      (pin) => {
        return this._simulation.getPinValue(pin);
      }
    );

    this._testingServiceProducer.on(
      "call-function",
      async (consumerId, requestId, functionName, args) => {
        console.log(
          `Calling function "${functionName}" with following arguments: ${JSON.stringify(
            args
          )}`
        );

        try {
          const returnValue =
            await this._testingServiceProducer.executeFunction(
              functionName,
              ...args
            );

          await this._testingServiceProducer.send(consumerId, {
            type: "testing:function:return",
            content: {
              requestId,
              success: true,
              message: `Function "${functionName}"executed successfully!`,
              returnValue,
            },
          });
        } catch (error) {
          await this._testingServiceProducer.send(consumerId, {
            type: "testing:function:return",
            content: {
              requestId,
              success: false,
              message: error instanceof Error ? error.message : undefined,
            },
          });
        }
      }
    );

    this._testingServiceProducer.on(
      "start-testing",
      async (consumerId, requestId) => {
        console.log("Starting testing!");

        this._simulation.stop();

        await this._testingServiceProducer.send(consumerId, {
          type: "testing:start:response",
          content: {
            requestId,
            success: true,
            message: "Testing started successfully!",
          },
        });
      }
    );

    this._testingServiceProducer.on(
      "end-testing",
      async (consumerId, requestId) => {
        console.log("Ending testing!");

        this._simulation.stop();
        if (this._currentProgram) {
          await this._program(this._currentProgram);
        }
        this._simulation.start();

        await this._testingServiceProducer.send(consumerId, {
          type: "testing:end:response",
          content: {
            requestId,
            success: true,
            message: "Testing ended successfully!",
          },
        });
      }
    );

    // NOTE: is this necessary?
    this._testingServiceProducer.on("new-consumer", (consumerId) => {
      console.log(
        `Added new testing service consumer with id "${consumerId}"!`
      );
    });

    this._deviceHandler.addService(this._gpioService);
    this._deviceHandler.addService(this._debuggingTargetServiceProducer);
    this._deviceHandler.addService(this._programmingServiceProducer);
    this._deviceHandler.addService(this._messagingService);
    this._deviceHandler.addService(this._testingServiceProducer);

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
    this._currentProgram = program;
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
