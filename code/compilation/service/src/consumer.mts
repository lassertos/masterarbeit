import {
  DataChannel,
  PeerConnection,
  Service,
  ServiceConfiguration,
  ServiceDirection,
} from "@cross-lab-project/soa-client";
import {
  IncomingMessage,
  isProtocolMessage,
  ProtocolMessage,
} from "@crosslab-ide/abstract-messaging-channel";
import {
  CompilationProtocol,
  compilationProtocol,
  Directory,
} from "@crosslab-ide/compilation-messaging-protocol";
import { CrossLabMessagingChannel } from "@crosslab-ide/crosslab-messaging-channel";
import { PromiseManager } from "./promiseManager.mjs";
import { v4 as uuidv4 } from "uuid";

export class CompilationService__Consumer implements Service {
  private _messagingChannel?: CrossLabMessagingChannel<
    CompilationProtocol,
    "client"
  >;
  private _promiseManager: PromiseManager = new PromiseManager();
  serviceType: string = "https://api.goldi-labs.de/service-types/compilation";
  serviceId: string;
  serviceDirection: ServiceDirection = "consumer";

  constructor(serviceId: string) {
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
        this._promiseManager.resolve(message.content.requestId, message);
        break;
      default:
        throw new Error(`Unrecognized message type "${message.type}"!`);
    }
  }

  async compile(
    directory: Directory
  ): Promise<
    ProtocolMessage<CompilationProtocol, "compilation:response">["content"]
  > {
    if (!this._messagingChannel) {
      throw new Error("No messaging channel has been set up!");
    }

    const requestId = uuidv4();
    const promise = this._promiseManager.add(requestId);

    await this._messagingChannel.send({
      type: "compilation:request",
      content: { requestId, directory },
    });

    const response = await promise;

    if (
      !isProtocolMessage(compilationProtocol, "compilation:response", response)
    ) {
      throw new Error(
        'Received message is not of expected type "compilation:response"!'
      );
    }

    return response.content;
  }
}
