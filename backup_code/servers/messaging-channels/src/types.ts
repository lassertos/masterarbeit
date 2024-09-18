import { z } from "zod";

const MessageSchema = z.object({
    type: z.string(),
    content: z.unknown(),
});
export type Message = z.infer<typeof MessageSchema>;
export function isMessage(input: unknown): input is Message {
    return MessageSchema.safeParse(input).success;
}

export type MessagingProtocol<
    M extends string = string,
    R extends string = string,
> = {
    messageTypes: M[];
    roles: R[];
    messages: {
        [k in M]: z.Schema;
    };
    roleMessages: {
        [k in R]: {
            incoming: M[];
            outgoing: M[];
        };
    };
};

export type MessageType<MP extends MessagingProtocol> =
    MP["messageTypes"][number];

export type Role<MP extends MessagingProtocol | undefined = undefined> =
    MP extends MessagingProtocol ? MP["roles"][number] : string;

export type _ProtocolMessage<
    MP extends MessagingProtocol,
    M extends MessageType<MP>[],
> = M extends [infer H, ...infer T]
    ? H extends MessageType<MP>
        ? T extends MessageType<MP>[]
            ?
                  | { type: H; content: z.infer<MP["messages"][H]> }
                  | _ProtocolMessage<MP, T>
            : never
        : never
    : never;

export type ProtocolMessage<
    MP extends MessagingProtocol | undefined = undefined,
> = MP extends MessagingProtocol
    ? _ProtocolMessage<MP, MP["messageTypes"]>
    : Message;

export type IncomingMessage<
    MP extends MessagingProtocol | undefined = undefined,
    R extends Role<MP> | undefined = undefined,
> = MP extends MessagingProtocol
    ? R extends Role<MP>
        ? _ProtocolMessage<MP, MP["roleMessages"][R]["incoming"]>
        : ProtocolMessage<MP>
    : Message;

export type OutgoingMessage<
    MP extends MessagingProtocol | undefined = undefined,
    R extends Role<MP> | undefined = undefined,
> = MP extends MessagingProtocol
    ? R extends Role<MP>
        ? _ProtocolMessage<MP, MP["roleMessages"][R]["outgoing"]>
        : ProtocolMessage<MP>
    : Message;

export function isIncomingMessage<
    MP extends MessagingProtocol | undefined,
    R extends Role<MP> | undefined,
>(protocol: MP, role: R, message: unknown): message is IncomingMessage<MP, R> {
    let valid = false;
    if (!protocol) {
        valid = isMessage(message);
    } else if (protocol && !role) {
        for (const messageType of protocol.messageTypes) {
            valid = protocol.messages[messageType].safeParse(message).success;
            if (valid) break;
        }
    } else if (protocol && role) {
        for (const messageType of protocol.roleMessages[role].incoming) {
            valid = protocol.messages[messageType].safeParse(message).success;
            if (valid) break;
        }
    }
    return valid;
}

export function isOutgoingMessage<
    MP extends MessagingProtocol | undefined,
    R extends Role<MP> | undefined,
>(protocol: MP, role: R, message: unknown): message is OutgoingMessage<MP, R> {
    let valid = false;
    if (!protocol) {
        valid = isMessage(message);
    } else if (protocol && !role) {
        for (const messageType of protocol.messageTypes) {
            valid = protocol.messages[messageType].safeParse(message).success;
            if (valid) break;
        }
    } else if (protocol && role) {
        for (const messageType of protocol.roleMessages[role].outgoing) {
            valid = protocol.messages[messageType].safeParse(message).success;
            if (valid) break;
        }
    }
    return valid;
}
