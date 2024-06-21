import {
  MessageService__Consumer,
  MessageService__Producer,
} from "@cross-lab-project/soa-service-message";
import { MessageChannel } from "./messageChannel";
import { DeviceHandler } from "@cross-lab-project/soa-client";

export class CrossLabMessageChannel extends MessageChannel {
  private _deviceHandler: DeviceHandler;
  private _messageServiceProducer: MessageService__Producer;
  private _messageServiceConsumer: MessageService__Consumer;

  constructor(options: { endpoint: string; deviceUrl: string; token: string }) {
    super();

    this._deviceHandler = new DeviceHandler();
    this._messageServiceConsumer = new MessageService__Consumer("incoming");
    this._messageServiceProducer = new MessageService__Producer("outgoing");

    this._messageServiceConsumer.on("message", (event) => {
      this.emit("message", event.message);
    });

    this._deviceHandler.addService(this._messageServiceConsumer);
    this._deviceHandler.addService(this._messageServiceProducer);

    this._deviceHandler.on("experimentStatusChanged", (event) => {
      switch (event.status) {
        case "created":
          break;
        case "booked":
          break;
        case "setup":
          break;
        case "running":
          this.emit("ready");
        case "failed":
          this.emit("close");
        case "closed":
          this.emit("close");
      }
    });

    this._deviceHandler.connect({
      endpoint: options.endpoint,
      id: options.deviceUrl,
      token: options.token,
    });
  }

  send(message: string): void {
    this._messageServiceProducer.sendMessage(message, "lsp");
  }
}
