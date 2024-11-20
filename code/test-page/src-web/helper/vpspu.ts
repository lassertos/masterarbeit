import { APIClient } from "@cross-lab-project/api-client";
import { configuration } from "../configuration.js";

export default async () => {
  const apiClient = new APIClient(configuration.apiUrl);
  await apiClient.login(configuration.username, configuration.password);

  const devices = await apiClient.listDevices();
  const edgeInstantiableDevices = devices.filter(
    (device) => device.type === "edge instantiable"
  );

  for (const edgeInstantiableDevice of edgeInstantiableDevices) {
    const resolvedDevice = await apiClient.getDevice(
      edgeInstantiableDevice.url
    );
    if (resolvedDevice.codeUrl === configuration.vpspuUrl) {
      return resolvedDevice.url;
    }
  }

  return (
    await apiClient.createDevice({
      type: "edge instantiable",
      name: "vpspu",
      codeUrl: configuration.vpspuUrl,
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
      isPublic: true,
    })
  ).url;
};
