import { CrossLabMessagingChannel } from "@crosslab-ide/crosslab-messaging-channel";
import {
  DataChannel,
  PeerConnection,
  Service,
  ServiceConfiguration,
  ServiceDirection,
} from "@crosslab-ide/soa-client";
import { TypedEmitter } from "tiny-typed-emitter";
import { debuggingProtocol, DebuggingProtocol } from "./protocol.mjs";
import {
  IncomingMessage,
  OutgoingMessage,
} from "@crosslab-ide/abstract-messaging-channel";
import { Directory } from "./types.mjs";

interface DebuggingServiceProducerEvents {
  "new-session": (sessionInfo: {
    id: string;
    directory: Directory;
    configuration: unknown;
  }) => void;
  message: (sessionId: string, message: unknown) => void;
}

export class DebuggingServiceProducer
  extends TypedEmitter<DebuggingServiceProducerEvents>
  implements Service
{
  private _messagingChannel?: CrossLabMessagingChannel<
    DebuggingProtocol,
    "server"
  >;
  serviceType: string = "https://api.goldi-labs.de/serviceTypes/debugging";
  serviceId: string;
  serviceDirection: ServiceDirection = "producer";

  constructor(serviceId: string) {
    super();
    this.serviceId = serviceId;
  }

  getMeta() {
    return {
      serviceId: this.serviceId,
      serviceType: this.serviceType,
      serviceDirection: this.serviceDirection,
      supportedConnectionTypes: ["webrtc", "websocket"],
    };
  }

  setupConnection(
    connection: PeerConnection,
    serviceConfig: ServiceConfiguration
  ): void {
    // TODO: add checkConfig
    const channel = new DataChannel();
    this._messagingChannel = new CrossLabMessagingChannel(
      channel,
      debuggingProtocol,
      "server"
    );
    this._messagingChannel.on("message", (message) =>
      this._handleMessage(message)
    );
    if (connection.tiebreaker) {
      connection.transmit(serviceConfig, "data", channel);
    } else {
      connection.receive(serviceConfig, "data", channel);
    }
  }

  async send(message: OutgoingMessage<DebuggingProtocol, "server">) {
    if (!this._messagingChannel) {
      throw new Error("No messaging channel has been set up!");
    }
    await this._messagingChannel.send(message);
  }

  private _handleMessage(
    message: IncomingMessage<DebuggingProtocol, "server">
  ) {
    switch (message.type) {
      case "message:dap":
        return this.emit(
          "message",
          message.content.sessionId,
          message.content.message
        );
      case "session:start:request":
        return this.emit("new-session", message.content);
    }
  }
}
