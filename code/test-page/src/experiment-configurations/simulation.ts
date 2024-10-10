import { ExperimentServiceTypes } from "@cross-lab-project/api-client";

export default (deviceUrls: {
  "code-editor": string;
  compiler: string;
  simulation: string;
  vpspu: string;
}): ExperimentServiceTypes.Template<"request"> => {
  return {
    name: "Simulated Microcontroller + Virtual Device (Compiler only)",
    configuration: {
      devices: [
        {
          device: deviceUrls["code-editor"],
          role: "code-editor",
        },
        {
          device: deviceUrls["compiler"],
          role: "compiler",
        },
        {
          device: deviceUrls["simulation"],
          role: "simulation",
        },
        {
          device: deviceUrls["vpspu"],
          role: "vpspu",
        },
      ],
      roles: [
        { name: "code-editor" },
        { name: "compiler" },
        { name: "simulation" },
        { name: "vpspu" },
      ],
      serviceConfigurations: [
        {
          serviceType: "https://api.goldi-labs.de/serviceTypes/filesystem",
          participants: [
            {
              role: "code-editor",
              config: {},
              serviceId: "compilation:filesystem",
            },
            {
              role: "code-editor",
              config: {},
              serviceId: "filesystem",
            },
          ],
        },
        {
          serviceType: "https://api.goldi-labs.de/serviceTypes/compilation",
          participants: [
            {
              role: "code-editor",
              config: {},
              serviceId: "compilation",
            },
            {
              role: "compiler",
              config: {},
              serviceId: "compilation",
            },
          ],
        },
        {
          serviceType: "https://api.goldi-labs.de/serviceTypes/electrical",
          participants: [
            {
              role: "vpspu",
              serviceId: "sensors",
              config: {
                interfaces: [
                  {
                    interfaceId: "1",
                    interfaceType: "gpio",
                    signals: {
                      gpio: "LimitXLeft",
                    },
                    busId: "LimitXLeft",
                    direction: "out",
                    driver: "simulation",
                  },
                  {
                    interfaceId: "2",
                    interfaceType: "gpio",
                    signals: {
                      gpio: "LimitXRight",
                    },
                    busId: "LimitXRight",
                    direction: "out",
                    driver: "simulation",
                  },
                  {
                    interfaceId: "3",
                    interfaceType: "gpio",
                    signals: {
                      gpio: "LimitYTop",
                    },
                    busId: "LimitYTop",
                    direction: "out",
                    driver: "simulation",
                  },
                  {
                    interfaceId: "4",
                    interfaceType: "gpio",
                    signals: {
                      gpio: "LimitYBottom",
                    },
                    busId: "LimitYBottom",
                    direction: "out",
                    driver: "simulation",
                  },
                ],
              },
            },
            {
              role: "vpspu",
              serviceId: "actuators",
              config: {
                interfaces: [
                  {
                    interfaceId: "5",
                    interfaceType: "gpio",
                    signals: {
                      gpio: "XMotorLeft",
                    },
                    busId: "XMotorLeft",
                    direction: "in",
                    driver: "simulation",
                  },
                  {
                    interfaceId: "6",
                    interfaceType: "gpio",
                    signals: {
                      gpio: "XMotorRight",
                    },
                    busId: "XMotorRight",
                    direction: "in",
                    driver: "simulation",
                  },
                  {
                    interfaceId: "7",
                    interfaceType: "gpio",
                    signals: {
                      gpio: "YMotorTop",
                    },
                    busId: "YMotorTop",
                    direction: "in",
                    driver: "simulation",
                  },
                  {
                    interfaceId: "8",
                    interfaceType: "gpio",
                    signals: {
                      gpio: "YMotorBottom",
                    },
                    busId: "YMotorBottom",
                    direction: "in",
                    driver: "simulation",
                  },
                ],
              },
            },
            {
              role: "simulation",
              serviceId: "gpios",
              config: {
                interfaces: [
                  {
                    interfaceId: "9",
                    interfaceType: "gpio",
                    signals: {
                      gpio: "A0",
                    },
                    busId: "LimitXLeft",
                    direction: "in",
                    driver: "simulation",
                  },
                  {
                    interfaceId: "10",
                    interfaceType: "gpio",
                    signals: {
                      gpio: "A1",
                    },
                    busId: "LimitXRight",
                    direction: "in",
                    driver: "simulation",
                  },
                  {
                    interfaceId: "11",
                    interfaceType: "gpio",
                    signals: {
                      gpio: "A2",
                    },
                    busId: "LimitYTop",
                    direction: "in",
                    driver: "simulation",
                  },
                  {
                    interfaceId: "12",
                    interfaceType: "gpio",
                    signals: {
                      gpio: "A3",
                    },
                    busId: "LimitYBottom",
                    direction: "in",
                    driver: "simulation",
                  },
                  {
                    interfaceId: "13",
                    interfaceType: "gpio",
                    signals: {
                      gpio: "A4",
                    },
                    busId: "XMotorLeft",
                    direction: "out",
                    driver: "simulation",
                  },
                  {
                    interfaceId: "14",
                    interfaceType: "gpio",
                    signals: {
                      gpio: "A5",
                    },
                    busId: "XMotorRight",
                    direction: "out",
                    driver: "simulation",
                  },
                  {
                    interfaceId: "15",
                    interfaceType: "gpio",
                    signals: {
                      gpio: "A6",
                    },
                    busId: "YMotorTop",
                    direction: "out",
                    driver: "simulation",
                  },
                  {
                    interfaceId: "16",
                    interfaceType: "gpio",
                    signals: {
                      gpio: "A7",
                    },
                    busId: "YMotorBottom",
                    direction: "out",
                    driver: "simulation",
                  },
                ],
              },
            },
          ],
        },
      ],
    },
  };
};
