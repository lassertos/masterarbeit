import { JSONSchemaType } from "ajv";

export type WebSocketConnectionOptions = {
  type: "webSocket";
  endpoint: string;
  room: string;
  token: string;
};

export const WebsocketConnectionOptionSchema: JSONSchemaType<WebSocketConnectionOptions> =
  {
    type: "object",
    properties: {
      type: { type: "string", const: "webSocket" },
      endpoint: { type: "string" },
      room: { type: "string" },
      token: { type: "string" },
    },
    required: ["type", "endpoint", "room", "token"],
  };
