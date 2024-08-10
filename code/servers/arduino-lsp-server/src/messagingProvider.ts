import { TypedEmitter } from "tiny-typed-emitter";
import {
    AbstractMessagingChannel,
    MessagingProtocol,
} from "messaging-channels";
import { z } from "zod";
import { WebSocketServer } from "ws";
import {} from "shared-library";

const dataMessageSchema = z.object({
    type: z.literal("data"),
    data: z.string(),
});
export type DataMessage = z.infer<typeof dataMessageSchema>;

const fileEventMessageSchema = z.union([
    z.object({
        type: z.literal("file-event"),
        event: z.union([z.literal("create"), z.literal("delete")]),
        path: z.string(),
    }),
    z.object({
        type: z.literal("file-event"),
        event: z.literal("change"),
        path: z.string(),
        content: z.instanceof(Uint8Array),
    }),
]);
export type FileEventMessage = z.infer<typeof fileEventMessageSchema>;

const messageSchema = z.union([dataMessageSchema, fileEventMessageSchema]);
export type Message = z.infer<typeof messageSchema>;

type MessageType = "data" | "file-event";
type Role = "client" | "server";

const lspMessagingProtocol = {
    messageTypes: ["data", "file-event"],
    messages: {
        "data": dataMessageSchema,
        "file-event": fileEventMessageSchema,
    },
    roles: ["client", "server"],
    roleMessages: {
        client: { incoming: ["data"], outgoing: ["data", "file-event"] },
        server: { incoming: ["data", "file-event"], outgoing: ["data"] },
    },
} as const satisfies MessagingProtocol<MessageType, Role>;
type LspMessagingProtocol = typeof lspMessagingProtocol;

type MessagingProviderEvents = {
    "message-channel": (
        messageChannel: AbstractMessagingChannel<LspMessagingProtocol>
    ) => void;
};

abstract class AbstractMessagingProvider extends TypedEmitter<MessagingProviderEvents> {}

export class WebSocketMessagingProvider extends AbstractMessagingProvider {
    private webSocketServer: WebSocketServer;

    constructor() {
        super();
        this.webSocketServer = new WebSocketServer();

        this.webSocketServer.on("connection", (webSocket) => {
            this.emit("message-channel", new WebSocket());
        });
    }
}
