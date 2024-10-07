import { APIClient } from "@cross-lab-project/api-client";
import test from "@playwright/test";
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
      ],
    });

    await apiClient.createDevice({
      type: "cloud instantiable",
      name: "simavr",
      isPublic: true,
      codeUrl: "http://localhost:3023",
      services: [],
    });
  });
});
