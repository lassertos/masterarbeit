import { ExperimentServiceTypes } from "@cross-lab-project/api-client";

export default (deviceUrls: {
  "code-editor": string;
  compiler: string;
}): ExperimentServiceTypes.Template<"request"> => {
  return {
    name: "Collaboration Setup (+ Compilation)",
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
        {
          device: deviceUrls["compiler"],
          role: "compiler",
        },
      ],
      roles: [
        { name: "code-editor-1" },
        { name: "code-editor-2" },
        { name: "compiler" },
      ],
      serviceConfigurations: [
        {
          serviceType: "https://api.goldi-labs.de/serviceTypes/collaboration",
          configuration: {
            rooms: ["projects", "status"],
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
        {
          serviceType: "https://api.goldi-labs.de/serviceTypes/compilation",
          participants: [
            {
              role: "code-editor-1",
              serviceId: "compilation",
              config: {},
            },
            {
              role: "compiler",
              serviceId: "compilation",
              config: {},
            },
          ],
        },
        {
          serviceType: "https://api.goldi-labs.de/serviceTypes/compilation",
          participants: [
            {
              role: "code-editor-2",
              serviceId: "compilation",
              config: {},
            },
            {
              role: "compiler",
              serviceId: "compilation",
              config: {},
            },
          ],
        },
        {
          serviceType: "https://api.goldi-labs.de/serviceTypes/filesystem",
          participants: [
            {
              role: "code-editor-1",
              serviceId: "compilation:filesystem",
              config: {},
            },
            {
              role: "code-editor-1",
              serviceId: "filesystem",
              config: {},
            },
          ],
        },
        {
          serviceType: "https://api.goldi-labs.de/serviceTypes/filesystem",
          participants: [
            {
              role: "code-editor-2",
              serviceId: "compilation:filesystem",
              config: {},
            },
            {
              role: "code-editor-2",
              serviceId: "filesystem",
              config: {},
            },
          ],
        },
      ],
    },
  };
};
