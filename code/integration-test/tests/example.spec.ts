import { test } from "@playwright/test";
import { APIClient } from "@cross-lab-project/api-client";
import assert from "assert";

test("example", async () => {
  const apiClient = new APIClient("http://localhost");

  await apiClient.login("admin", "admin");

  const devices = await apiClient.listDevices();

  assert.strictEqual(devices.length, 1);
  assert.strictEqual(devices[0].name, "test-device");
});
