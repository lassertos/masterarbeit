import { ExperimentServiceTypes } from "@cross-lab-project/api-client";
import { arduinoSketchTemplateVPSPU } from "../templates/arduino.js";

export default (deviceUrls: {
  "code-editor": string;
  "language-server": string;
}): ExperimentServiceTypes.Template<"request"> => {
  return {
    name: "Language Server only",
    configuration: {
      devices: [
        {
          device: deviceUrls["code-editor"],
          role: "code-editor",
        },
        {
          device: deviceUrls["language-server"],
          role: "language-server",
        },
      ],
      roles: [
        {
          name: "code-editor",
          configuration: {
            extensions: ["crosslab.@crosslab-ide/crosslab-lsp-extension"],
            templates: [
              {
                name: "Arduino Sketch",
                content: {
                  "{{projectName}}.ino": {
                    type: "file",
                    content: arduinoSketchTemplateVPSPU,
                  },
                },
              },
            ],
          },
        },
        { name: "language-server" },
      ],
      serviceConfigurations: [
        {
          serviceType: "https://api.goldi-labs.de/serviceTypes/lsp",
          participants: [
            {
              role: "code-editor",
              config: {},
              serviceId: "lsp-extension:lsp",
            },
            {
              role: "language-server",
              config: {},
              serviceId: "lsp",
            },
          ],
        },
      ],
    },
  };
};
