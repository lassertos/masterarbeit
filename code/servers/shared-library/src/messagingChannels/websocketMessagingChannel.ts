import WebSocket from "ws";
import {
    AbstractMessagingChannel,
    isIncomingMessage,
    MessagingProtocol,
    OutgoingMessage,
    Role,
} from "messaging-channels";

export class WebSocketMessagingChannel<
    MP extends MessagingProtocol | undefined = undefined,
    R extends Role<MP> | undefined = undefined,
> extends AbstractMessagingChannel<MP, R> {
    private _webSocket: WebSocket;

    constructor(webSocketEndpoint: string, protocol: MP, role: R) {
        super({ protocol, role });
        this._webSocket = new WebSocket(webSocketEndpoint);
        this._webSocket.on("open", () => {
            this.emit("ready");
        });
        this._webSocket.on("close", () => {
            this.emit("close");
        });
        this._webSocket.on("message", (data) => {
            const message = JSON.parse(data.toString());

            if (!isIncomingMessage(protocol, role, message)) {
                throw new Error("invalid message format!");
            }

            this.emit("message", message);
        });
    }

    send(message: OutgoingMessage<MP, R>): Promise<void> | void {
        this._webSocket.send(JSON.stringify(message));
    }
}
