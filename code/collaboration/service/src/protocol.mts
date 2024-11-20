import { MessagingProtocol } from "@crosslab-ide/abstract-messaging-channel";
import { z } from "zod";

export const collaborationProtocol = {
  messageTypes: [
    "collaboration:initialization:request",
    "collaboration:initialization:response",
    "collaboration:message",
  ],
  messages: {
    "collaboration:initialization:request": z.object({
      id: z.string(),
    }),
    "collaboration:initialization:response": z.undefined(),
    "collaboration:message": z.object({
      room: z.string(),
      type: z.string(),
      content: z.unknown(),
    }),
  },
  roles: ["participant"],
  roleMessages: {
    participant: {
      incoming: [
        "collaboration:initialization:request",
        "collaboration:initialization:response",
        "collaboration:message",
      ],
      outgoing: [
        "collaboration:initialization:request",
        "collaboration:initialization:response",
        "collaboration:message",
      ],
    },
  },
} as const satisfies MessagingProtocol<
  | "collaboration:initialization:request"
  | "collaboration:initialization:response"
  | "collaboration:message",
  "participant"
>;
