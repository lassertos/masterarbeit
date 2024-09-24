import {
  DataChannel,
  PeerConnection,
  Service,
  ServiceConfiguration,
  ServiceDirection,
} from "@cross-lab-project/soa-client";
import { TypedEmitter } from "tiny-typed-emitter";
import {
  IncomingMessage,
  OutgoingMessage,
  ProtocolMessage,
} from "@crosslab-ide/abstract-messaging-channel";
import { CrossLabMessagingChannel } from "@crosslab-ide/crosslab-messaging-channel";
import {
  CompilationProtocol,
  compilationProtocol,
} from "@crosslab-ide/compilation-messaging-protocol";

interface CompilationService__ProducerEvents {
  "compilation:request": (
    request: ProtocolMessage<CompilationProtocol, "compilation:request">
  ) => void;
}

export class CompilationService__Producer
  extends TypedEmitter<CompilationService__ProducerEvents>
  implements Service
{
  private _messagingChannel?: CrossLabMessagingChannel<
    CompilationProtocol,
    "server"
  >;
  serviceType: string = "https://api.goldi-labs.de/service-types/compilation";
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
    // TODO: add checkConfig function
    const channel = new DataChannel();
    this._messagingChannel = new CrossLabMessagingChannel(
      channel,
      compilationProtocol,
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

  send(message: OutgoingMessage<CompilationProtocol, "server">) {
    this._messagingChannel?.send(message);
  }

  private _handleMessage(
    message: IncomingMessage<CompilationProtocol, "server">
  ) {
    switch (message.type) {
      case "compilation:request":
        // TODO: implement
        break;
      default:
        throw new Error(`Unrecognized message type "${message.type}"!`);
    }
  }
}
