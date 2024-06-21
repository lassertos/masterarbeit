import WebSocket from "ws";
import { MessageChannel } from "./messageChannel";

export class WebSocketMessageChannel extends MessageChannel {
  private _webSocket: WebSocket;

  constructor(options: { endpoint: string; room: string; token: string }) {
    super();
    this._webSocket = new WebSocket(options.endpoint);

    this._webSocket.once("open", () => {
      this._webSocket.send(
        JSON.stringify({
          room: options.room,
          token: options.token,
        })
      );
    });

    this._webSocket.on("close", () => {
      this.emit("close");
    });

    this._webSocket.once("message", (message) => {
      const parsedMessage = JSON.parse(message.toString());
      if (!parsedMessage.authorized) this.emit("close");
      this._webSocket.on("message", (message) => {
        this.emit("message", message.toString());
      });
      this.emit("ready");
    });
  }

  send(message: string): void {
    this._webSocket.send(message);
  }
}
