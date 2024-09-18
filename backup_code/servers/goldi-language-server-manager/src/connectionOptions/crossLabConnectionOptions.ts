import { JSONSchemaType } from "ajv";

export type CrossLabConnectionOptions = {
  type: "crossLab";
  endpoint: string;
  deviceUrl: string;
  token: string;
};

export const CrossLabConnectionOptionSchema: JSONSchemaType<CrossLabConnectionOptions> =
  {
    type: "object",
    properties: {
      type: { type: "string", const: "crossLab" },
      endpoint: { type: "string" },
      deviceUrl: { type: "string" },
      token: { type: "string" },
    },
    required: ["type", "endpoint", "deviceUrl", "token"],
  };
