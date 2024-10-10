import { test } from "@playwright/test";
import { APIClient } from "@cross-lab-project/api-client";
import assert from "assert";
import { checkDevices, logging, sleep } from "./helper.js";

test("simple experiment", async ({ page, browserName }) => {
  test.slow();
  logging(test, browserName, page);

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
      {
        serviceType: "http://localhost:8080/serviceTypes/filesystem",
        participants: [
          {
            role: "client",
            serviceId: "filesystem",
            config: {
              templates: [
                {
                  id: "template:arduino:basic",
                  name: "arduino",
                  content: [
                    {
                      type: "file",
                      name: "arduino.ino",
                      content:
                        "void setup() {\n\t// write your setup code here!\n}\n\nvoid loop() {\n\t// write your main loop here!\n}",
                    },
                  ],
                },
              ],
            },
          },
          { role: "client", serviceId: "compilation:filesystem", config: {} },
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
      .locator(
        "#crosslab\\.\\@crosslab-ide\\/crosslab-base-extension\\.experiment-status"
      )
      .first()
      .getAttribute("aria-label")) !== "CrossLab Experiment: running"
  ) {
    await sleep(1000);
  }

  await sleep(1000);
});
