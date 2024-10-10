import { APIClient } from "@cross-lab-project/api-client";
import { test } from "@playwright/test";
import assert from "assert";

test.describe.serial("global setup", () => {
  test("wait for services", async () => {
    test.slow();
    let active;

    while (!active) {
      active = true;
      for (const service of [
        "auth",
        "authorization",
        "device",
        "experiment",
        "federation",
        "forwarding",
      ]) {
        try {
          const response = await fetch(
            `http://localhost:8080/${service}/status`
          );
          const bodyJson = await response.json();
          if (bodyJson.status !== "ok") {
            active = false;
          }
        } catch {
          active = false;
          break;
        }
      }
      if (active === true) {
        break;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 2000));
    }

    assert(active);
  });

  test("setup", async () => {
    const apiClient = new APIClient("http://localhost:8080");

    await apiClient.login("admin", "admin");

    for (const device of await apiClient.listDevices()) {
      console.log("deleting device", device.url);
      await apiClient.deleteDevice(device.url);
    }

    await apiClient.createDevice({
      type: "cloud instantiable",
      name: "arduino-cli-compilation-server",
      isPublic: true,
      instantiateUrl: "http://compilation:3021",
      services: [
        {
          serviceDirection: "producer",
          serviceId: "compilation",
          serviceType: "http://localhost:8080/serviceTypes/compilation",
          supportedConnectionTypes: ["websocket"],
        },
      ],
    });

    await apiClient.createDevice({
      type: "edge instantiable",
      name: "code-editor",
      isPublic: true,
      codeUrl: "http://localhost:3022",
      services: [
        {
          serviceDirection: "consumer",
          serviceId: "compilation",
          serviceType: "http://localhost:8080/serviceTypes/compilation",
          supportedConnectionTypes: ["webrtc", "websocket"],
        },
        {
          serviceDirection: "prosumer",
          serviceId: "gpios",
          serviceType: "https://api.goldi-labs.de/serviceTypes/electrical",
          supportedConnectionTypes: ["webrtc", "websocket"],
        },
      ],
    });

    await apiClient.createDevice({
      type: "cloud instantiable",
      name: "simavr",
      isPublic: true,
      instantiateUrl: "http://simavr:3023",
      services: [
        {
          serviceDirection: "consumer",
          serviceId: "program",
          serviceType: "https://api.goldi-labs.de/serviceTypes/file",
          supportedConnectionTypes: ["websocket"],
        },
        {
          serviceDirection: "prosumer",
          serviceId: "gpios",
          serviceType: "https://api.goldi-labs.de/serviceTypes/electrical",
          supportedConnectionTypes: ["websocket"],
        },
      ],
    });

    await apiClient.createDevice({
      type: "edge instantiable",
      name: "vpspu",
      isPublic: true,
      codeUrl: "http://localhost:3024",
      services: [
        {
          serviceDirection: "prosumer",
          serviceId: "sensors",
          serviceType: "https://api.goldi-labs.de/serviceTypes/electrical",
          supportedConnectionTypes: ["webrtc", "websocket"],
        },
        {
          serviceDirection: "prosumer",
          serviceId: "actuators",
          serviceType: "https://api.goldi-labs.de/serviceTypes/electrical",
          supportedConnectionTypes: ["webrtc", "websocket"],
        },
      ],
    });

    await apiClient.createDevice({
      type: "device",
      name: "test",
      isPublic: true,
      services: [
        {
          serviceDirection: "producer",
          serviceId: "file",
          serviceType: "https://api.goldi-labs.de/serviceTypes/file",
          supportedConnectionTypes: ["webrtc", "websocket"],
        },
      ],
    });
  });
});
