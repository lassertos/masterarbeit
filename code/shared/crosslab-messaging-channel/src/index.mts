import { DataChannel } from "@cross-lab-project/soa-client";
import {
  AbstractMessagingChannel,
  isIncomingMessage,
  MessagingProtocol,
  OutgoingMessage,
  Role,
} from "@crosslab-ide/abstract-messaging-channel";

export class CrossLabMessagingChannel<
  MP extends MessagingProtocol | undefined = undefined,
  R extends Role<MP> | undefined = undefined
> extends AbstractMessagingChannel<MP, R> {
  private _channel: DataChannel;

  constructor(channel: DataChannel, protocol: MP, role: R) {
    super(protocol, role);
    this._channel = channel;
    this._channel.ready().then(() => this.emit("ready"));
    this._channel.ondata = (data: unknown) => {
      if (typeof data === "string") {
        const message = JSON.parse(data);
        if (isIncomingMessage(protocol, role, message)) {
          this.emit("message", message);
        }
      }
    };
  }

  send(message: OutgoingMessage<MP, R>): Promise<void> | void {
    this._channel.send(JSON.stringify(message));
  }
}
