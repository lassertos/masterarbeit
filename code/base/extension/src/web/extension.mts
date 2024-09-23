import { DeviceHandler } from "@crosslab-ide/soa-client";
import { APIClient } from "@cross-lab-project/api-client";
import * as vscode from "vscode";

export async function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "crosslab-base-extension" is now active in the web extension host!'
  );

  const deviceHandler = new DeviceHandler();

  const disposable = vscode.commands.registerCommand(
    "crosslab-base-extension.helloWorld",
    () => {
      vscode.window.showInformationMessage(
        "Hello World from crosslab-base-extension in a web extension host!"
      );
    }
  );

  context.subscriptions.push(disposable);
  const extensions = vscode.extensions.all;

  for (const extension of extensions) {
    if (
      extension.id.startsWith("crosslab") &&
      extension.id !== context.extension.id
    ) {
      const api = await extension.activate();
      api.addServices(deviceHandler);
    }
  }

  console.log("crosslab services initialized successfully!");
  console.log(deviceHandler.getServiceMeta());

  const configuration = vscode.workspace.getConfiguration();
  const instanceUrl = configuration.get("crosslab.instanceUrl");
  const deviceToken = configuration.get("crosslab.deviceToken");

  if (typeof instanceUrl !== "string") {
    throw new Error(
      `expected configuration option "crosslab.instanceUrl" to be of type "string" but got type "${typeof instanceUrl}"`
    );
  }

  if (typeof deviceToken !== "string") {
    throw new Error(
      `expected configuration option "crosslab.deviceToken" to be of type "string" but got type "${typeof deviceToken}"`
    );
  }

  if (instanceUrl && deviceToken) {
    const baseUrl = instanceUrl.slice(0, instanceUrl.indexOf("/devices"));
    console.log(instanceUrl, deviceToken, baseUrl);
    const apiClient = new APIClient(baseUrl, deviceToken);
    try {
      const token = await apiClient.createWebsocketToken(instanceUrl);
      console.log(token);

      const statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Left
      );
      statusBarItem.text = "CrossLab Experiment: connecting";
      statusBarItem.show();
      context.subscriptions.push(statusBarItem);

      deviceHandler.on("experimentStatusChanged", (statusUpdate) => {
        statusBarItem.text = `CrossLab Experiment: ${statusUpdate.status}`;
      });

      await deviceHandler.connect({
        endpoint: baseUrl + "/devices/websocket",
        id: instanceUrl,
        token: token,
      });
      console.log("connection established successfully!");
    } catch (error) {
      console.error(error);
    }
  }
}

export function deactivate() {}
