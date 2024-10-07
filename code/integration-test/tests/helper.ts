import { DeviceServiceTypes } from "@cross-lab-project/api-client";

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
