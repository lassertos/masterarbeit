import { MessagingProtocol } from "@crosslab-ide/abstract-messaging-channel";
import { z } from "zod";

export const yjsCollaborationProtocol = {
  messageTypes: [
    "yjs:sync:step1",
    "yjs:sync:step2",
    "yjs:sync:done",
    "yjs:sync:update",
    "yjs:awareness:query",
    "yjs:awareness:update",
  ],
  messages: {
    "yjs:sync:step1": z.object({
      message: z.instanceof(Uint8Array),
    }),
    "yjs:sync:step2": z.object({
      message: z.instanceof(Uint8Array),
    }),
    "yjs:sync:done": z.undefined(),
    "yjs:sync:update": z.object({
      message: z.instanceof(Uint8Array),
    }),
    "yjs:awareness:update": z.object({
      message: z.instanceof(Uint8Array),
    }),
    "yjs:awareness:query": z.undefined(),
  },
  roles: ["participant"],
  roleMessages: {
    participant: {
      incoming: [
        "yjs:sync:step1",
        "yjs:sync:step2",
        "yjs:sync:done",
        "yjs:sync:update",
        "yjs:awareness:query",
        "yjs:awareness:update",
      ],
      outgoing: [
        "yjs:sync:step1",
        "yjs:sync:step2",
        "yjs:sync:done",
        "yjs:sync:update",
        "yjs:awareness:query",
        "yjs:awareness:update",
      ],
    },
  },
} as const satisfies MessagingProtocol<
  | "yjs:sync:step1"
  | "yjs:sync:step2"
  | "yjs:sync:done"
  | "yjs:sync:update"
  | "yjs:awareness:query"
  | "yjs:awareness:update",
  "participant"
>;
