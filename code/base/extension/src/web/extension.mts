import { DeviceHandler } from "@crosslab-ide/soa-client";
import { APIClient } from "@cross-lab-project/api-client";
import * as vscode from "vscode";
import {
  openSettingsDatabase,
  readSetting,
  writeSetting,
} from "@crosslab-ide/editor-settings";

export async function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "crosslab-base-extension" is now active in the web extension host!'
  );

  const deviceHandler = new DeviceHandler();
  deviceHandler.supportedConnectionTypes = ["websocket", "local"];

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

  const statusBarItem = vscode.window.createStatusBarItem(
    "experiment-status",
    vscode.StatusBarAlignment.Left
  );
  context.subscriptions.push(statusBarItem);

  console.log("extensionUri:", context.extensionUri);

  const settingsDatabase = await openSettingsDatabase();
  // const configuration = vscode.workspace.getConfiguration();
  const instanceUrl = new URLSearchParams(context.extensionUri.query).get(
    "instanceUrl"
  );
  const deviceToken = new URLSearchParams(context.extensionUri.query).get(
    "deviceToken"
  );
  console.log("instanceUrl:", instanceUrl);
  console.log("deviceToken:", deviceToken);

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

  await writeSetting(settingsDatabase, "crosslab.instanceUrl", instanceUrl);
  await writeSetting(settingsDatabase, "crosslab.deviceToken", deviceToken);

  deviceHandler.on("experimentStatusChanged", (statusUpdate) => {
    statusBarItem.text = `CrossLab Experiment: ${statusUpdate.status}`;
  });
  statusBarItem.text = "CrossLab Experiment: initializing";
  statusBarItem.show();

  for (const extension of extensions) {
    if (
      extension.id.startsWith("crosslab") &&
      extension.id !== context.extension.id
    ) {
      const api = extension.isActive
        ? extension.exports
        : await extension.activate();
      if (api && api.addServices) {
        api.addServices(deviceHandler);
      }
    }
  }

  console.log("crosslab services initialized successfully!");
  console.log(deviceHandler.getServiceMeta());

  statusBarItem.text = "CrossLab Experiment: waiting";

  if (instanceUrl && deviceToken) {
    const baseUrl = instanceUrl.slice(0, instanceUrl.indexOf("/devices"));
    console.log(instanceUrl, deviceToken, baseUrl);
    const apiClient = new APIClient(baseUrl, deviceToken);
    try {
      const token = await apiClient.createWebsocketToken(instanceUrl);
      console.log(token);

      statusBarItem.text = "CrossLab Experiment: connecting";

      await deviceHandler.connect({
        endpoint: baseUrl + "/devices/websocket",
        id: instanceUrl,
        token: token,
      });

      console.log("connection established successfully!");
    } catch (error) {
      console.error("connection failed:", error);
    }
  }
}

export function deactivate() {}
