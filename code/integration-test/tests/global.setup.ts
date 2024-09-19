import { APIClient } from "@cross-lab-project/api-client";
import test from "@playwright/test";

test("setup", async () => {
  const apiClient = new APIClient("http://localhost");

  await apiClient.login("admin", "admin");

  await apiClient.createDevice({
    type: "device",
    name: "test-device",
    isPublic: true,
  });
});
