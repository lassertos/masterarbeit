import { MessagingProtocol } from "@crosslab-ide/abstract-messaging-channel";
import { z } from "zod";
import { DirectorySchema } from "./types.mjs";

export const debuggingAdapterProtocol = {
  messageTypes: [
    "message:dap",
    "session:start:request",
    "session:start:response",
  ],
  roles: ["client", "server"],
  messages: {
    "message:dap": z.object({
      sessionId: z.string(),
      message: z.record(z.unknown()),
    }),
    "session:start:request": z.object({
      requestId: z.string(),
      directory: DirectorySchema,
      configuration: z.optional(z.record(z.unknown())), // TODO: add option to instantiate protocol with configuration schema
    }),
    "session:start:response": z.union([
      z.object({
        requestId: z.string(),
        success: z.literal(true),
        message: z.optional(z.string()),
        sessionId: z.string(),
        configuration: z.optional(z.record(z.unknown())),
      }),
      z.object({
        requestId: z.string(),
        success: z.literal(false),
        message: z.optional(z.string()),
      }),
    ]),
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
} as const satisfies MessagingProtocol;

export type DebuggingAdapterProtocol = typeof debuggingAdapterProtocol;
