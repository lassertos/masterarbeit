import { MessagingProtocol } from "@crosslab-ide/abstract-messaging-channel";
import { z } from "zod";

type LanguageServerRole = "client" | "server";
type LanguageServerMessageType =
  | "lsp:initialization:request"
  | "lsp:initialization:response"
  | "lsp:filesystem:write-file:request"
  | "lsp:filesystem:write-file:response"
  | "lsp:filesystem:create-directory:request"
  | "lsp:filesystem:create-directory:response"
  | "lsp:filesystem:delete:request"
  | "lsp:filesystem:delete:response"
  | "lsp:filesystem:read:request"
  | "lsp:filesystem:read:response"
  | "lsp:message";

export const languageServerMessagingProtocol = {
  messageTypes: [
    "lsp:initialization:request",
    "lsp:initialization:response",
    "lsp:filesystem:write-file:request",
    "lsp:filesystem:write-file:response",
    "lsp:filesystem:create-directory:request",
    "lsp:filesystem:create-directory:response",
    "lsp:filesystem:delete:request",
    "lsp:filesystem:delete:response",
    "lsp:filesystem:read:request",
    "lsp:filesystem:read:response",
    "lsp:message",
  ],
  messages: {
    "lsp:initialization:request": z.undefined(),
    "lsp:initialization:response": z.object({
      sourcesPath: z.string(),
      configuration: z.record(z.unknown()),
    }),
    "lsp:filesystem:write-file:request": z.object({
      requestId: z.string(),
      path: z.string(),
      content: z.string(),
    }),
    "lsp:filesystem:write-file:response": z.object({
      requestId: z.string(),
      success: z.boolean(),
      message: z.optional(z.string()),
    }),
    "lsp:filesystem:create-directory:request": z.object({
      requestId: z.string(),
      path: z.string(),
    }),
    "lsp:filesystem:create-directory:response": z.object({
      requestId: z.string(),
      success: z.boolean(),
      message: z.optional(z.string()),
    }),
    "lsp:filesystem:delete:request": z.object({
      requestId: z.string(),
      path: z.string(),
    }),
    "lsp:filesystem:delete:response": z.object({
      requestId: z.string(),
      success: z.boolean(),
      message: z.optional(z.string()),
    }),
    "lsp:filesystem:read:request": z.object({
      requestId: z.string(),
      path: z.string(),
    }),
    "lsp:filesystem:read:response": z.union([
      z.object({
        requestId: z.string(),
        success: z.literal(true),
        content: z.string(),
      }),
      z.object({
        requestId: z.string(),
        success: z.literal(false),
        message: z.optional(z.string()),
      }),
    ]),
    "lsp:message": z.string(),
  },
  roles: ["client", "server"],
  roleMessages: {
    client: {
      incoming: [
        "lsp:initialization:response",
        "lsp:filesystem:write-file:response",
        "lsp:filesystem:create-directory:response",
        "lsp:filesystem:delete:response",
        "lsp:filesystem:read:response",
        "lsp:message",
      ],
      outgoing: [
        "lsp:initialization:request",
        "lsp:filesystem:write-file:request",
        "lsp:filesystem:create-directory:request",
        "lsp:filesystem:delete:request",
        "lsp:filesystem:read:request",
        "lsp:message",
      ],
    },
    server: {
      incoming: [
        "lsp:initialization:request",
        "lsp:filesystem:write-file:request",
        "lsp:filesystem:create-directory:request",
        "lsp:filesystem:delete:request",
        "lsp:filesystem:read:request",
        "lsp:message",
      ],
      outgoing: [
        "lsp:initialization:response",
        "lsp:filesystem:write-file:response",
        "lsp:filesystem:create-directory:response",
        "lsp:filesystem:delete:response",
        "lsp:filesystem:read:response",
        "lsp:message",
      ],
    },
  },
} as const satisfies MessagingProtocol<
  LanguageServerMessageType,
  LanguageServerRole
>;

export type LanguageServerMessagingProtocol =
  typeof languageServerMessagingProtocol;
