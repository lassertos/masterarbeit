import { APIClient, DeviceServiceTypes } from "@cross-lab-project/api-client";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import { Page, TestType } from "@playwright/test";
import fs from "fs";
import path from "path";
import { FileService__Producer } from "@crosslab-ide/soa-service-file";

export async function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

export function checkDevices<T extends string>(
  devices: DeviceServiceTypes.DeviceOverview<"response">[],
  deviceDescriptions: { name: T; type: DeviceServiceTypes.Device["type"] }[]
): Record<T, string> {
  const foundDevices: Partial<Record<T, string>> = {};
  for (const deviceDescription of deviceDescriptions) {
    const foundDevice = devices.find(
      (device) =>
        device.name === deviceDescription.name &&
        device.type === deviceDescription.type
    );
    if (!foundDevice) {
      throw new Error(`device "${deviceDescription.name}" not found!`);
    }
    foundDevices[deviceDescription.name] = foundDevice.url;
  }
  return foundDevices as Record<T, string>;
}

export function logging(
  test: TestType<{}, {}>,
  browserName: string,
  page: Page
) {
  const logFolderPath = `.buildsystem/logs/${
    path.parse(test.info().file).name.split(".")[0]
  }/${test.info().title.replaceAll(" ", "-")}`;
  const logFilePath = `${logFolderPath}/${browserName}.log`;

  fs.rmSync(logFilePath, {
    force: true,
  });

  if (!fs.existsSync(logFolderPath)) {
    fs.mkdirSync(logFolderPath, { recursive: true });
  }

  page.on("console", (message) => {
    fs.appendFileSync(logFilePath, message.text() + "\n");
  });
}

export async function connectTestDevice() {
  const apiClient = new APIClient("http://localhost:8080");

  await apiClient.login("admin", "admin");
  const deviceHandler = new DeviceHandler();
  const fileService = new FileService__Producer("file");

  deviceHandler.addService(fileService);

  const devices = checkDevices(await apiClient.listDevices(), [
    { name: "test", type: "device" },
  ]);
  const token = await apiClient.createWebsocketToken(devices.test);

  await deviceHandler.connect({
    endpoint: "ws://localhost:8080/devices/websocket",
    id: devices.test,
    token,
  });

  return {
    sendFile: fileService.sendFile.bind(fileService),
  };
}
