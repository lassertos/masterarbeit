import { MessagingProtocol } from "@crosslab-ide/abstract-messaging-channel";
import { z } from "zod";
import { DirectorySchema } from "./types.mjs";

type DebuggingProtocolMessageType =
  | "message:dap"
  | "session:start:request"
  | "session:start:response";
type DebuggingProtocolRole = "client" | "server";

export const debuggingProtocol = {
  messageTypes: ["message:dap", "session:start:request"],
  roles: ["client", "server"],
  messages: {
    "message:dap": z.object({
      sessionId: z.string(),
      message: z.record(z.unknown()),
    }),
    "session:start:request": z.object({
      id: z.string(),
      directory: DirectorySchema, // TODO: change to directory schema
      configuration: z.record(z.unknown()), // TODO: add option to instantiate protocol with configuration schema
    }),
    "session:start:response": z.object({
      id: z.string(),
      success: z.boolean(),
      message: z.optional(z.string()),
    }),
  },
  roleMessages: {
    client: {
      incoming: ["message:dap", "session:start:response"],
      outgoing: ["message:dap", "session:start:request"],
    },
    server: {
      incoming: ["message:dap", "session:start:request"],
      outgoing: ["message:dap", "session:start:response"],
    },
  },
} as const satisfies MessagingProtocol<
  DebuggingProtocolMessageType,
  DebuggingProtocolRole
>;

export type DebuggingProtocol = typeof debuggingProtocol;
