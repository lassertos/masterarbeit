import { DeviceHandler } from "@crosslab-ide/soa-client";
import { APIClient } from "@cross-lab-project/api-client";
import * as vscode from "vscode";
import { z } from "zod";

const configurationSchema = z.object({
  extensions: z.optional(z.array(z.string())),
});
function isConfiguration(
  input: unknown
): input is z.infer<typeof configurationSchema> {
  return configurationSchema.safeParse(input).success;
}

export async function activate(context: vscode.ExtensionContext) {
  console.log(
    'Congratulations, your extension "crosslab-base-extension" is now active in the web extension host!'
  );

  const timeout = setTimeout(() => startExtension(context, disposable), 10000);
  const disposable = vscode.workspace.onDidChangeConfiguration(
    async (event) => {
      console.log(
        "crosslab settings changed:",
        event.affectsConfiguration("crosslab")
      );
      if (!event.affectsConfiguration("crosslab")) return;

      clearTimeout(timeout);
      startExtension(context, disposable);
    }
  );
}

async function startExtension(
  context: vscode.ExtensionContext,
  disposable: vscode.Disposable
) {
  console.log("starting base extension!");
  disposable.dispose();

  const statusBarItem = vscode.window.createStatusBarItem(
    "experiment-status",
    vscode.StatusBarAlignment.Left
  );
  context.subscriptions.push(statusBarItem);

  const deviceHandler = new DeviceHandler(false);
  deviceHandler.supportedConnectionTypes = ["websocket", "local"];

  const crosslabConfiguration = vscode.workspace.getConfiguration("crosslab");
  const instanceUrl = crosslabConfiguration.get("instanceUrl");
  const deviceToken = crosslabConfiguration.get("deviceToken");

  if (!instanceUrl || typeof instanceUrl !== "string") {
    throw new Error("Parameter instanceUrl was not set!");
  }

  if (!deviceToken || typeof deviceToken !== "string") {
    throw new Error("Parameter deviceToken was not set!");
  }

  deviceHandler.on("experimentStatusChanged", (statusUpdate) => {
    statusBarItem.text = `CrossLab Experiment: ${statusUpdate.status}`;
  });
  statusBarItem.text = "CrossLab Experiment: initializing";
  statusBarItem.show();

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

  const configuration = await new Promise<{ [k: string]: unknown }>(
    (resolve) => {
      deviceHandler.on("configuration", (configuration) => {
        console.log(
          "BASE: received IDE configuration for experiment",
          configuration
        );
        resolve(configuration);
      });
    }
  );

  if (!isConfiguration(configuration)) {
    throw new Error("Configuration of IDE is malformed!");
  }

  const extensions = vscode.extensions.all;
  const extensionsToLoad = configuration.extensions;

  for (const extension of extensions) {
    if (
      extension.id.startsWith("crosslab") &&
      extension.id !== context.extension.id &&
      (!extensionsToLoad || extensionsToLoad.includes(extension.id))
    ) {
      const api = extension.isActive
        ? extension.exports
        : await extension.activate();
      if (api && api.loadCrosslabServices) {
        const services = api.loadCrosslabServices(
          structuredClone(configuration)
        );
        for (const service of services) {
          deviceHandler.addService(service);
        }
      }
    }
  }

  console.log("crosslab services initialized successfully!");
  console.log(deviceHandler.getServiceMeta());

  deviceHandler.setReady();
}

export function deactivate() {}
