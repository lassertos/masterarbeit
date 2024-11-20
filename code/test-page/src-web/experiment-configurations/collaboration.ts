import { ExperimentServiceTypes } from "@cross-lab-project/api-client";

export default (deviceUrls: {
  "code-editor": string;
}): ExperimentServiceTypes.Template<"request"> => {
  return {
    name: "Minimal Collaboration Setup",
    configuration: {
      devices: [
        {
          device: deviceUrls["code-editor"],
          role: "code-editor-1",
        },
        {
          device: deviceUrls["code-editor"],
          role: "code-editor-2",
        },
      ],
      roles: [{ name: "code-editor-1" }, { name: "code-editor-2" }],
      serviceConfigurations: [
        {
          serviceType: "https://api.goldi-labs.de/serviceTypes/collaboration",
          configuration: {
            rooms: ["projects"],
          },
          participants: [
            {
              role: "code-editor-1",
              serviceId: "collaboration",
              config: {},
            },
            {
              role: "code-editor-2",
              serviceId: "collaboration",
              config: {},
            },
          ],
        },
      ],
    },
  };
};
