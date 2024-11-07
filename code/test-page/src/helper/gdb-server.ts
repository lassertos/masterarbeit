import { APIClient } from "@cross-lab-project/api-client";
import { configuration } from "../configuration.js";

export default async () => {
  const apiClient = new APIClient(configuration.apiUrl);
  await apiClient.login(configuration.username, configuration.password);

  const devices = await apiClient.listDevices();
  const cloudInstantiableDevices = devices.filter(
    (device) => device.type === "cloud instantiable"
  );

  for (const cloudInstantiableDevice of cloudInstantiableDevices) {
    const resolvedDevice = await apiClient.getDevice(
      cloudInstantiableDevice.url
    );
    if (resolvedDevice.instantiateUrl === configuration.debuggerUrl) {
      return resolvedDevice.url;
    }
  }

  return (
    await apiClient.createDevice({
      type: "cloud instantiable",
      name: "debugger",
      instantiateUrl: configuration.debuggerUrl,
      services: [
        {
          serviceDirection: "producer",
          serviceId: "debugging-adapter",
          serviceType:
            "https://api.goldi-labs.de/serviceTypes/debugging-adapter",
          supportedConnectionTypes: ["websocket"],
        },
        {
          serviceDirection: "consumer",
          serviceId: "compilation",
          serviceType: "https://api.goldi-labs.de/serviceTypes/compilation",
          supportedConnectionTypes: ["websocket"],
        },
        {
          serviceDirection: "consumer",
          serviceId: "debugging-target",
          serviceType:
            "https://api.goldi-labs.de/serviceTypes/debugging-target",
          supportedConnectionTypes: ["websocket"],
        },
        {
          serviceDirection: "prosumer",
          serviceId: "messaging",
          serviceType: "https://api.goldi-labs.de/serviceTypes/messaging",
          supportedConnectionTypes: ["websocket"],
        },
      ],
      isPublic: true,
    })
  ).url;
};
