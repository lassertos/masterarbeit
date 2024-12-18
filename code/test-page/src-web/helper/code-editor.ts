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
    if (resolvedDevice.codeUrl === configuration.codeEditorUrl) {
      return resolvedDevice.url;
    }
  }

  return (
    await apiClient.createDevice({
      type: "edge instantiable",
      name: "code-editor",
      codeUrl: configuration.codeEditorUrl,
      services: [
        {
          serviceDirection: "consumer",
          serviceId: "lsp-extension:lsp",
          serviceType: "https://api.goldi-labs.de/serviceTypes/lsp",
          supportedConnectionTypes: ["websocket", "local"],
        },
        {
          serviceDirection: "prosumer",
          serviceId: "collaboration",
          serviceType: "https://api.goldi-labs.de/serviceTypes/collaboration",
          supportedConnectionTypes: ["websocket", "local"],
        },
        {
          serviceDirection: "consumer",
          serviceId: "testing-extension:testing",
          serviceType: "https://api.goldi-labs.de/serviceTypes/testing",
          supportedConnectionTypes: ["websocket", "local"],
        },
        {
          serviceDirection: "consumer",
          serviceId: "debugging:debugging-adapter",
          serviceType:
            "https://api.goldi-labs.de/serviceTypes/debugging-adapter",
          supportedConnectionTypes: ["websocket", "local"],
        },
        {
          serviceDirection: "consumer",
          serviceId: "debugging:filesystem",
          serviceType: "https://api.goldi-labs.de/serviceTypes/filesystem",
          supportedConnectionTypes: ["websocket", "local"],
        },
        {
          serviceDirection: "producer",
          serviceId: "compilation:file",
          serviceType: "https://api.goldi-labs.de/serviceTypes/file",
          supportedConnectionTypes: ["websocket", "local"],
        },
        {
          serviceDirection: "producer",
          serviceId: "filesystem",
          serviceType: "https://api.goldi-labs.de/serviceTypes/filesystem",
          supportedConnectionTypes: ["websocket", "local"],
        },
        {
          serviceDirection: "consumer",
          serviceId: "compilation:filesystem",
          serviceType: "https://api.goldi-labs.de/serviceTypes/filesystem",
          supportedConnectionTypes: ["websocket", "local"],
        },
        {
          serviceDirection: "consumer",
          serviceId: "compilation",
          serviceType: "https://api.goldi-labs.de/serviceTypes/compilation",
          supportedConnectionTypes: ["websocket"],
        },
        {
          serviceDirection: "prosumer",
          serviceId: "gpios",
          serviceType: "https://api.goldi-labs.de/serviceTypes/electrical",
          supportedConnectionTypes: ["websocket"],
        },
      ],
      isPublic: true,
    })
  ).url;
};
