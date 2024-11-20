import { DataChannel } from "@crosslab-ide/soa-client";
import {
  AbstractMessagingChannel,
  isIncomingMessage,
  MessagingProtocol,
  OutgoingMessage,
  Role,
} from "@crosslab-ide/abstract-messaging-channel";
import { replacer, reviver } from "./util.mjs";

export class CrossLabMessagingChannel<
  MP extends MessagingProtocol | undefined = undefined,
  R extends Role<MP> | undefined = undefined
> extends AbstractMessagingChannel<MP, R> {
  private _channel: DataChannel;

  constructor(channel: DataChannel, protocol: MP, role: R) {
    super(protocol, role);
    this._channel = channel;
    this._channel.ready().then(() => {
      this._status = "open";
      this.emit("ready");
    });
    this._channel.ondata = (data: unknown) => {
      console.log(`received data: ${data}`);
      if (typeof data === "string") {
        const message = JSON.parse(data, reviver);
        if (isIncomingMessage(protocol, role, message)) {
          console.log("emitting message", message);
          this.emit("message", message);
        }
      }
    };
  }

  send(message: OutgoingMessage<MP, R>): Promise<void> | void {
    console.log(`sending message: ${JSON.stringify(message, replacer)}`);
    this._channel.send(JSON.stringify(message, replacer));
  }
}
