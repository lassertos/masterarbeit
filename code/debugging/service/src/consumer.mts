import { CrossLabMessagingChannel } from "@crosslab-ide/crosslab-messaging-channel";
import {
  DataChannel,
  PeerConnection,
  Service,
  ServiceConfiguration,
  ServiceDirection,
} from "@crosslab-ide/soa-client";
import { debuggingProtocol, DebuggingProtocol } from "./protocol.mjs";
import {
  IncomingMessage,
  OutgoingMessage,
} from "@crosslab-ide/abstract-messaging-channel";
import { TypedEmitter } from "tiny-typed-emitter";

interface DebuggingServiceConsumerEvents {
  message: (message: IncomingMessage<DebuggingProtocol, "client">) => void;
}

export class DebuggingServiceConsumer
  extends TypedEmitter<DebuggingServiceConsumerEvents>
  implements Service
{
  private _messagingChannel?: CrossLabMessagingChannel<
    DebuggingProtocol,
    "client"
  >;
  private _sessions: Map<string, unknown> = new Map();
  serviceType: string = "https://api.goldi-labs.de/serviceTypes/debugging";
  serviceId: string;
  serviceDirection: ServiceDirection = "consumer";

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
    // TODO: add checkConfig function
    const channel = new DataChannel();
    this._messagingChannel = new CrossLabMessagingChannel(
      channel,
      debuggingProtocol,
      "client"
    );
    this._messagingChannel.on("message", (message) =>
      this.emit("message", message)
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

  async startSession(session: { id: string }, configuration: unknown) {}
}
