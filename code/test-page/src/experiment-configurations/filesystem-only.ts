import { ExperimentServiceTypes } from "@cross-lab-project/api-client";

export default (deviceUrls: {
  "code-editor": string;
}): ExperimentServiceTypes.Template<"request"> => {
  return {
    name: "Standalone Code Editor",
    configuration: {
      devices: [
        {
          device: deviceUrls["code-editor"],
          role: "editor",
        },
      ],
      roles: [{ name: "editor" }],
      serviceConfigurations: [],
    },
  };
};
