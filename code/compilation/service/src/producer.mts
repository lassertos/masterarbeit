import {
  DataChannel,
  PeerConnection,
  Service,
  ServiceConfiguration,
  ServiceDirection,
} from "@crosslab-ide/soa-client";
import { TypedEmitter } from "tiny-typed-emitter";
import {
  IncomingMessage,
  OutgoingMessage,
  ProtocolMessage,
} from "@crosslab-ide/abstract-messaging-channel";
import { CrossLabMessagingChannel } from "@crosslab-ide/crosslab-messaging-channel";
import {
  buildCompilationProtocol,
  CompilationProtocol,
  ResultFormatsDescriptor,
} from "@crosslab-ide/compilation-messaging-protocol";

interface CompilationService__ProducerEvents<
  R extends ResultFormatsDescriptor
> {
  "compilation:request": (
    request: ProtocolMessage<
      CompilationProtocol<R>,
      "compilation:request"
    >["content"]
  ) => void;
}

export class CompilationService__Producer<R extends ResultFormatsDescriptor>
  extends TypedEmitter<CompilationService__ProducerEvents<R>>
  implements Service
{
  private _messagingChannel?: CrossLabMessagingChannel<
    CompilationProtocol<R>,
    "server"
  >;
  private _compilationProtocol: CompilationProtocol<R>;
  serviceType: string = "https://api.goldi-labs.de/serviceTypes/compilation";
  serviceId: string;
  serviceDirection: ServiceDirection = "producer";

  constructor(serviceId: string, resultFormatsDescription?: R) {
    super();
    this.serviceId = serviceId;
    this._compilationProtocol = buildCompilationProtocol(
      resultFormatsDescription
    );
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
      this._compilationProtocol,
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

  async send(message: OutgoingMessage<CompilationProtocol<R>, "server">) {
    if (!this._messagingChannel) {
      throw new Error("No messaging channel has been set up!");
    }
    await this._messagingChannel.send(message);
  }

  private _handleMessage(
    message: IncomingMessage<CompilationProtocol<R>, "server">
  ) {
    switch (message.type) {
      case "compilation:request":
        this.emit("compilation:request", message.content);
        break;
      default:
        throw new Error(`Unrecognized message type "${message.type}"!`);
    }
  }
}
