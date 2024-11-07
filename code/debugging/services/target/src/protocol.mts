import { MessagingProtocol } from "@crosslab-ide/abstract-messaging-channel";
import z from "zod";

export const debuggingTargetProtocol = {
  messageTypes: [
    "debugging:start:request",
    "debugging:start:response",
    "debugging:end:request",
    "debugging:end:response",
  ],
  messages: {
    "debugging:start:request": z.object({
      requestId: z.string(),
      program: z.instanceof(Uint8Array),
    }),
    "debugging:start:response": z.object({
      requestId: z.string(),
      success: z.boolean(),
      message: z.optional(z.string()),
    }),
    "debugging:end:request": z.object({
      requestId: z.string(),
    }),
    "debugging:end:response": z.object({
      requestId: z.string(),
      success: z.boolean(),
      message: z.optional(z.string()),
    }),
  },
  roles: ["client", "target"],
  roleMessages: {
    client: {
      incoming: ["debugging:start:response", "debugging:end:response"],
      outgoing: ["debugging:start:request", "debugging:end:request"],
    },
    target: {
      incoming: ["debugging:start:request", "debugging:end:request"],
      outgoing: ["debugging:start:response", "debugging:end:response"],
    },
  },
} as const satisfies MessagingProtocol;

export type DebuggingTargetProtocol = typeof debuggingTargetProtocol;
