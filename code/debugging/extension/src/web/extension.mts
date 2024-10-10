import { DeviceHandler } from "@crosslab-ide/soa-client";
import {
  ElectricalConnectionService,
  GPIO,
} from "@crosslab-ide/soa-service-electrical";
import * as vscode from "vscode";

export function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "crosslab-debugging-extension" is now active in the web extension host!'
  );
  const disposable = vscode.commands.registerCommand(
    "crosslab-debugging-extension.helloWorld",
    () => {
      vscode.window.showInformationMessage(
        "Hello World from crosslab-debugging-extension in a web extension host!"
      );
    }
  );
  context.subscriptions.push(disposable);

  return {
    addServices: (deviceHandler: DeviceHandler) => {
      const electicalConnectionService = new ElectricalConnectionService(
        "gpios",
        []
      );

      const gpioInterface = new GPIO.ConstructableGPIOInterface([]);
      electicalConnectionService.addInterface(gpioInterface);

      electicalConnectionService.on("newInterface", (event) => {
        if (event.connectionInterface.interfaceType === "gpio") {
          const connectionInterface =
            event.connectionInterface as GPIO.GPIOInterface;
          if (
            connectionInterface.configuration.direction === "in" ||
            connectionInterface.configuration.direction === "inout"
          ) {
            connectionInterface.on("signalChange", (signalChangeEvent) => {
              console.log(
                `new value for "${connectionInterface.signal}": ${signalChangeEvent.state}`
              );
            });
            console.log(
              `initial value for "${connectionInterface.signal}" (${connectionInterface.configuration.direction}): ${connectionInterface.signalState}`
            );
          }
          if (
            connectionInterface.configuration.direction === "out" ||
            connectionInterface.configuration.direction === "inout"
          ) {
            console.log(
              `initial value for "${connectionInterface.signal}" (${connectionInterface.configuration.direction}): ${connectionInterface.signalState}`
            );
          }
        }
      });

      deviceHandler.addService(electicalConnectionService);
    },
  };
}

// This method is called when your extension is deactivated
export function deactivate() {}
