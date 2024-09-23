import { test } from "@playwright/test";
import { APIClient, DeviceServiceTypes } from "@cross-lab-project/api-client";
import assert from "assert";

function checkDevices<T extends string>(
  devices: DeviceServiceTypes.DeviceOverview<"response">[],
  deviceNames: T[]
): Record<T, string> {
  const foundDevices: Partial<Record<T, string>> = {};
  for (const deviceName of deviceNames) {
    const foundDevice = devices.find((device) => device.name === deviceName);
    if (!foundDevice) {
      throw new Error(`device "${deviceName}" not found!`);
    }
    foundDevices[deviceName] = foundDevice.url;
  }
  return foundDevices as Record<T, string>;
}

test("simple experiment", async () => {
  test.slow();

  const apiClient = new APIClient("http://localhost");

  await apiClient.login("admin", "admin");

  const devices = await apiClient.listDevices();

  assert.strictEqual(devices.length, 2);
  const foundDevices = checkDevices(devices, [
    "code-editor",
    "arduino-cli-compilation-server",
  ]);

  const experiment = await apiClient.createExperiment({
    status: "running",
    devices: [
      {
        device: foundDevices["arduino-cli-compilation-server"],
        role: "server",
      },
      {
        device: foundDevices["code-editor"],
        role: "client",
      },
    ],
    roles: [{ name: "server" }, { name: "client" }],
    serviceConfigurations: [
      {
        serviceType: "http://localhost/serviceTypes/compilation",
        participants: [
          { role: "server", serviceId: "compilation", config: {} },
          { role: "client", serviceId: "compilation", config: {} },
        ],
      },
    ],
  });

  assert.strictEqual(experiment.instantiatedDevices.length, 1);
  const instance = experiment.instantiatedDevices[0];
  console.log(
    experiment.instantiatedDevices[0].codeUrl +
      `?instanceUrl=${instance.url}&deviceToken=${instance.token}`
  );

  await new Promise<void>((resolve) => setTimeout(resolve, 60000));
});
