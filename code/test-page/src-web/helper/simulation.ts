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
    if (resolvedDevice.instantiateUrl === configuration.simulationUrl) {
      return resolvedDevice.url;
    }
  }

  return (
    await apiClient.createDevice({
      type: "cloud instantiable",
      name: "simulation",
      instantiateUrl: configuration.simulationUrl,
      services: [
        {
          serviceDirection: "producer",
          serviceId: "testing",
          serviceType: "https://api.goldi-labs.de/serviceTypes/testing",
          supportedConnectionTypes: ["websocket"],
          functions: [
            {
              name: "start",
              argumentSchemas: [],
            },
            {
              name: "stop",
              argumentSchemas: [],
            },
            {
              name: "setPinValue",
              argumentSchemas: [
                {
                  type: "string",
                },
                {
                  type: "number",
                },
              ],
            },
            {
              name: "getPinValue",
              argumentSchemas: [
                {
                  type: "string",
                },
              ],
            },
          ],
        },
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
        {
          serviceDirection: "prosumer",
          serviceId: "messaging",
          serviceType: "https://api.goldi-labs.de/serviceTypes/messaging",
          supportedConnectionTypes: ["websocket"],
        },
        {
          serviceDirection: "producer",
          serviceId: "programming",
          serviceType: "https://api.goldi-labs.de/serviceTypes/programming",
          supportedConnectionTypes: ["websocket"],
        },
        {
          serviceDirection: "producer",
          serviceId: "debugging-target",
          serviceType:
            "https://api.goldi-labs.de/serviceTypes/debugging-target",
          supportedConnectionTypes: ["websocket"],
        },
      ],
      isPublic: true,
    })
  ).url;
};
