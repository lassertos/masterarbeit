import { test } from "@playwright/test";
import { APIClient, DeviceServiceTypes } from "@cross-lab-project/api-client";
import assert from "assert";

async function sleep(milliseconds: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

function checkDevices<T extends string>(
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

test("simple experiment", async ({ page }) => {
  test.slow();

  const apiClient = new APIClient("http://localhost:8080");

  await apiClient.login("admin", "admin");

  const devices = await apiClient.listDevices();

  const foundDevices = checkDevices(devices, [
    { name: "code-editor", type: "edge instantiable" },
    { name: "arduino-cli-compilation-server", type: "cloud instantiable" },
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
        serviceType: "http://localhost:8080/serviceTypes/compilation",
        participants: [
          { role: "server", serviceId: "compilation", config: {} },
          { role: "client", serviceId: "compilation", config: {} },
        ],
      },
    ],
  });

  assert.strictEqual(experiment.instantiatedDevices.length, 1);
  const instance = experiment.instantiatedDevices[0];

  page.goto(
    `${experiment.instantiatedDevices[0].codeUrl}?instanceUrl=${instance.url}&deviceToken=${instance.token}`
  );

  while (!(await apiClient.getDevice(instance.url)).connected) {
    await sleep(1000);
  }

  while ((await apiClient.getExperiment(experiment.url)).status !== "running") {
    await sleep(1000);
  }

  while (
    (await page
      .locator("#crosslab\\.crosslab-base-extension\\.experiment-status")
      .first()
      .getAttribute("aria-label")) !== "CrossLab Experiment: running"
  ) {
    await sleep(1000);
  }

  await sleep(1000);
});
