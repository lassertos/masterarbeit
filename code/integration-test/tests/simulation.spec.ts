import { APIClient } from "@cross-lab-project/api-client";
import { test } from "@playwright/test";
import { checkDevices, connectTestDevice, logging, sleep } from "./helper.js";
import assert from "assert";
import fs from "fs";

test("simulation without editor", async ({ page, browserName }) => {
  test.slow();
  logging(test, browserName, page);

  const apiClient = new APIClient("http://localhost:8080");

  await apiClient.login("admin", "admin");

  const devices = await apiClient.listDevices();

  const foundDevices = checkDevices(devices, [
    { name: "vpspu", type: "edge instantiable" },
    { name: "simavr", type: "cloud instantiable" },
    { name: "test", type: "device" },
  ]);

  const testDevice = await connectTestDevice();

  const experiment = await apiClient.createExperiment({
    status: "running",
    devices: [
      { device: foundDevices.vpspu, role: "model" },
      { device: foundDevices.simavr, role: "controller" },
      { device: foundDevices.test, role: "programmer" },
    ],
    roles: [{ name: "model" }, { name: "controller" }, { name: "programmer" }],
    serviceConfigurations: [
      {
        serviceType: "https://api.goldi-labs.de/serviceTypes/file",
        participants: [
          {
            role: "controller",
            serviceId: "program",
            config: {},
          },
          {
            role: "programmer",
            serviceId: "file",
            config: {},
          },
        ],
      },
      {
        serviceType: "https://api.goldi-labs.de/serviceTypes/electrical",
        participants: [
          {
            role: "model",
            serviceId: "sensors",
            config: {
              interfaces: [
                {
                  interfaceId: "1",
                  interfaceType: "gpio",
                  signals: {
                    gpio: "LimitXLeft",
                  },
                  busId: "LimitXLeft",
                  direction: "out",
                  driver: "simulation",
                },
                {
                  interfaceId: "2",
                  interfaceType: "gpio",
                  signals: {
                    gpio: "LimitXRight",
                  },
                  busId: "LimitXRight",
                  direction: "out",
                  driver: "simulation",
                },
                {
                  interfaceId: "3",
                  interfaceType: "gpio",
                  signals: {
                    gpio: "LimitYTop",
                  },
                  busId: "LimitYTop",
                  direction: "out",
                  driver: "simulation",
                },
                {
                  interfaceId: "4",
                  interfaceType: "gpio",
                  signals: {
                    gpio: "LimitYBottom",
                  },
                  busId: "LimitYBottom",
                  direction: "out",
                  driver: "simulation",
                },
              ],
            },
          },
          {
            role: "model",
            serviceId: "actuators",
            config: {
              interfaces: [
                {
                  interfaceId: "5",
                  interfaceType: "gpio",
                  signals: {
                    gpio: "XMotorLeft",
                  },
                  busId: "XMotorLeft",
                  direction: "in",
                  driver: "simulation",
                },
                {
                  interfaceId: "6",
                  interfaceType: "gpio",
                  signals: {
                    gpio: "XMotorRight",
                  },
                  busId: "XMotorRight",
                  direction: "in",
                  driver: "simulation",
                },
                {
                  interfaceId: "7",
                  interfaceType: "gpio",
                  signals: {
                    gpio: "YMotorTop",
                  },
                  busId: "YMotorTop",
                  direction: "in",
                  driver: "simulation",
                },
                {
                  interfaceId: "8",
                  interfaceType: "gpio",
                  signals: {
                    gpio: "YMotorBottom",
                  },
                  busId: "YMotorBottom",
                  direction: "in",
                  driver: "simulation",
                },
              ],
            },
          },
          {
            role: "controller",
            serviceId: "gpios",
            config: {
              interfaces: [
                {
                  interfaceId: "9",
                  interfaceType: "gpio",
                  signals: {
                    gpio: "A0",
                  },
                  busId: "LimitXLeft",
                  direction: "in",
                  driver: "simulation",
                },
                {
                  interfaceId: "10",
                  interfaceType: "gpio",
                  signals: {
                    gpio: "A1",
                  },
                  busId: "LimitXRight",
                  direction: "in",
                  driver: "simulation",
                },
                {
                  interfaceId: "11",
                  interfaceType: "gpio",
                  signals: {
                    gpio: "A2",
                  },
                  busId: "LimitYTop",
                  direction: "in",
                  driver: "simulation",
                },
                {
                  interfaceId: "12",
                  interfaceType: "gpio",
                  signals: {
                    gpio: "A3",
                  },
                  busId: "LimitYBottom",
                  direction: "in",
                  driver: "simulation",
                },
                {
                  interfaceId: "13",
                  interfaceType: "gpio",
                  signals: {
                    gpio: "A4",
                  },
                  busId: "XMotorLeft",
                  direction: "out",
                  driver: "simulation",
                },
                {
                  interfaceId: "14",
                  interfaceType: "gpio",
                  signals: {
                    gpio: "A5",
                  },
                  busId: "XMotorRight",
                  direction: "out",
                  driver: "simulation",
                },
                {
                  interfaceId: "15",
                  interfaceType: "gpio",
                  signals: {
                    gpio: "A6",
                  },
                  busId: "YMotorTop",
                  direction: "out",
                  driver: "simulation",
                },
                {
                  interfaceId: "16",
                  interfaceType: "gpio",
                  signals: {
                    gpio: "A7",
                  },
                  busId: "YMotorBottom",
                  direction: "out",
                  driver: "simulation",
                },
              ],
            },
          },
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

  await testDevice.sendFile(
    "elf",
    fs.readFileSync(
      "tests/test-files/vpspu/build/arduino.avr.mega/vpspu.ino.elf"
    )
  );

  await sleep(30000);
});

test("simulation with editor", async ({ page, browserName }) => {
  test.slow();
  logging(test, browserName, page);

  const apiClient = new APIClient("http://localhost:8080");

  await apiClient.login("admin", "admin");

  const devices = await apiClient.listDevices();

  const foundDevices = checkDevices(devices, [
    { name: "code-editor", type: "edge instantiable" },
    { name: "simavr", type: "cloud instantiable" },
  ]);

  const experiment = await apiClient.createExperiment({
    status: "running",
    devices: [
      { device: foundDevices["code-editor"], role: "editor" },
      { device: foundDevices.simavr, role: "simulation" },
    ],
    roles: [{ name: "editor" }, { name: "simulation" }],
    serviceConfigurations: [
      {
        serviceType: "https://api.goldi-labs.de/serviceTypes/electrical",
        participants: [
          {
            role: "editor",
            config: {
              interfaces: [
                "A",
                "B",
                "C",
                "D",
                "E",
                "F",
                "G",
                "H",
                "J",
                "K",
                "L",
              ].flatMap((port, index) => {
                return [0, 1, 2, 3, 4, 5, 6, 7].map((pin) => {
                  return {
                    interfaceId: (index * 8 + pin).toString(),
                    interfaceType: "gpio",
                    signals: {
                      gpio: port + pin,
                    },
                    busId: port + pin,
                    direction: "in",
                    driver: "simulation",
                  };
                });
              }),
            },
            serviceId: "gpios",
          },
          {
            role: "simulation",
            config: {
              interfaces: [
                "A",
                "B",
                "C",
                "D",
                "E",
                "F",
                "G",
                "H",
                "J",
                "K",
                "L",
              ].flatMap((port, index) => {
                return [0, 1, 2, 3, 4, 5, 6, 7].map((pin) => {
                  return {
                    interfaceId: ((index + 11) * 8 + pin).toString(),
                    interfaceType: "gpio",
                    signals: {
                      gpio: port + pin,
                    },
                    busId: port + pin,
                    direction: "out",
                    driver: "simulation",
                  };
                });
              }),
            },
            serviceId: "gpios",
          },
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
