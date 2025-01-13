import { CrossLabMessagingChannel } from "@crosslab-ide/crosslab-messaging-channel";
import {
  DataChannel,
  PeerConnection,
  Service,
  ServiceConfiguration,
  ServiceDirection,
} from "@crosslab-ide/soa-client";
import { TypedEmitter } from "tiny-typed-emitter";
import {
  debuggingAdapterProtocol,
  DebuggingAdapterProtocol,
} from "./protocol.mjs";
import {
  IncomingMessage,
  OutgoingMessage,
} from "@crosslab-ide/abstract-messaging-channel";
import { Directory } from "@crosslab-ide/filesystem-schemas";
import { v4 as uuidv4 } from "uuid";
import { DebugAdapterProtocol } from "./dap-types.js";

interface DebuggingAdapterServiceProducerEvents {
  "new-session": (
    consumerId: string,
    requestId: string,
    sessionInfo: {
      directory: Directory;
      configuration?: unknown;
    }
  ) => void;
  "join-session": (
    consumerId: string,
    requestId: string,
    sessionId: string
  ) => void;
  "dap-message": (
    sessionId: string,
    message: DebugAdapterProtocol.ProtocolMessage
  ) => void;
}

export class DebuggingAdapterServiceProducer
  extends TypedEmitter<DebuggingAdapterServiceProducerEvents>
  implements Service
{
  private _consumers: Map<
    string,
    CrossLabMessagingChannel<DebuggingAdapterProtocol, "server">
  > = new Map();
  serviceType: string =
    "https://api.goldi-labs.de/serviceTypes/debugging-adapter";
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
    const messagingChannel = new CrossLabMessagingChannel(
      channel,
      debuggingAdapterProtocol,
      "server"
    );

    const consumerId = uuidv4();
    this._consumers.set(consumerId, messagingChannel);

    messagingChannel.on("message", (message) =>
      this._handleMessage(consumerId, message)
    );

    if (connection.tiebreaker) {
      connection.transmit(serviceConfig, "data", channel);
    } else {
      connection.receive(serviceConfig, "data", channel);
    }
  }

  async send(
    consumerId: string,
    message: OutgoingMessage<DebuggingAdapterProtocol, "server">
  ) {
    const consumer = this._consumers.get(consumerId);
    if (!consumer) {
      throw new Error(`Could not find consumer with id "${consumerId}"!`);
    }
    await consumer.send(message);
  }

  private _handleMessage(
    consumerId: string,
    message: IncomingMessage<DebuggingAdapterProtocol, "server">
  ) {
    switch (message.type) {
      case "message:dap":
        return this.emit(
          "dap-message",
          message.content.sessionId,
          message.content.message
        );
      case "session:start:request":
        return this.emit(
          "new-session",
          consumerId,
          message.content.requestId,
          message.content
        );
      case "session:join:request":
        return this.emit(
          "join-session",
          consumerId,
          message.content.requestId,
          message.content.sessionId
        );
    }
  }
}
