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
    if (resolvedDevice.instantiateUrl === configuration.compilerUrl) {
      return resolvedDevice.url;
    }
  }

  return (
    await apiClient.createDevice({
      type: "cloud instantiable",
      name: "compiler",
      instantiateUrl: configuration.compilerUrl,
      services: [
        {
          serviceDirection: "producer",
          serviceId: "compilation",
          serviceType: "https://api.goldi-labs.de/serviceTypes/compilation",
          supportedConnectionTypes: ["websocket"],
        },
      ],
      isPublic: true,
    })
  ).url;
};
