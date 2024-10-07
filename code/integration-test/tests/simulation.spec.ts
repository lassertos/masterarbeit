// import { APIClient } from "@cross-lab-project/api-client";
// import test from "@playwright/test";
// import { checkDevices, sleep } from "./helper";
// import assert from "assert";
// import fs from "fs";

// test("simulation", async ({ page, browserName }) => {
//   const apiClient = new APIClient("http://localhost:8080");

//   await apiClient.login("admin", "admin");

//   const devices = await apiClient.listDevices();

//   const foundDevices = checkDevices(devices, [
//     { name: "code-editor", type: "edge instantiable" },
//     { name: "simavr", type: "cloud instantiable" },
//   ]);

//   const experiment = await apiClient.createExperiment({
//     status: "running",
//     devices: [
//       { device: foundDevices["code-editor"], role: "editor" },
//       { device: foundDevices.simavr, role: "simulation" },
//     ],
//     roles: [{ name: "editor" }, { name: "simulation" }],
//     serviceConfigurations: [
//       {
//         serviceType: "http://localhost:8080/electrical",
//         participants: [
//           {
//             role: "editor",
//             config: {
//               interfaces: [
//                 ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L"].flatMap(
//                   (port, index) => {
//                     return [0, 1, 2, 3, 4, 5, 6, 7].map((pin) => {
//                       return {
//                         interfaceId: (index * 8 + pin).toString(),
//                         interfaceType: "gpio",
//                         signals: {
//                           gpio: port + pin,
//                         },
//                         busId: port + pin,
//                         direction: "in",
//                         driver: "simulation",
//                       };
//                     });
//                   }
//                 ),
//               ],
//             },
//             serviceId: "gpio",
//           },
//           {
//             role: "simulation",
//             config: {
//               interfaces: [
//                 ["A", "B", "C", "D", "E", "F", "G", "H", "J", "K", "L"].flatMap(
//                   (port, index) => {
//                     return [0, 1, 2, 3, 4, 5, 6, 7].map((pin) => {
//                       return {
//                         interfaceId: ((index + 11) * 8 + pin).toString(),
//                         interfaceType: "gpio",
//                         signals: {
//                           gpio: port + pin,
//                         },
//                         busId: port + pin,
//                         direction: "out",
//                         driver: "simulation",
//                       };
//                     });
//                   }
//                 ),
//               ],
//             },
//             serviceId: "gpio",
//           },
//         ],
//       },
//     ],
//   });

//   assert.strictEqual(experiment.instantiatedDevices.length, 1);
//   const instance = experiment.instantiatedDevices[0];

//   page.goto(
//     `${experiment.instantiatedDevices[0].codeUrl}?instanceUrl=${instance.url}&deviceToken=${instance.token}`
//   );

//   fs.rmSync(`.buildsystem/${browserName}.log`, { force: true });

//   page.on("console", (message) => {
//     fs.appendFileSync(`.buildsystem/${browserName}.log`, message.text() + "\n");
//   });

//   while (!(await apiClient.getDevice(instance.url)).connected) {
//     await sleep(1000);
//   }

//   while ((await apiClient.getExperiment(experiment.url)).status !== "running") {
//     await sleep(1000);
//   }

//   while (
//     (await page
//       .locator(
//         "#crosslab\\.\\@crosslab-ide\\/crosslab-base-extension\\.experiment-status"
//       )
//       .first()
//       .getAttribute("aria-label")) !== "CrossLab Experiment: running"
//   ) {
//     await sleep(1000);
//   }

//   await sleep(1000);
// });
