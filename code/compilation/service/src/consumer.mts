import {
  DataChannel,
  PeerConnection,
  Service,
  ServiceConfiguration,
  ServiceDirection,
} from "@crosslab-ide/soa-client";
import { TypedEmitter } from "tiny-typed-emitter";
import { IncomingMessage } from "@crosslab-ide/abstract-messaging-channel";
import {
  CompilationProtocol,
  compilationProtocol,
  Directory,
} from "@crosslab-ide/compilation-messaging-protocol";
import { CrossLabMessagingChannel } from "@crosslab-ide/crosslab-messaging-channel";

interface CompilationService__ComsumerEvents {
  "compilation:initialize": () => void;
  "compilation:result": () => void;
}

export class CompilationService__Consumer
  extends TypedEmitter<CompilationService__ComsumerEvents>
  implements Service
{
  private _messagingChannel?: CrossLabMessagingChannel<
    CompilationProtocol,
    "client"
  >;
  serviceType: string = "https://api.goldi-labs.de/service-types/compilation";
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
      compilationProtocol,
      "client"
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

  private _handleMessage(
    message: IncomingMessage<CompilationProtocol, "client">
  ) {
    switch (message.type) {
      case "compilation:response":
        // TODO: implement
        break;
      default:
        throw new Error(`Unrecognized message type "${message.type}"!`);
    }
  }

  sendCompilationRequest(directory: Directory) {
    this._messagingChannel?.send({
      type: "compilation:request",
      content: { directory },
    });
  }
}
