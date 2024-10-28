import {
  DataChannel,
  PeerConnection,
  Service,
  ServiceConfiguration,
  ServiceDirection,
} from "@crosslab-ide/soa-client";
import {
  IncomingMessage,
  isProtocolMessage,
  ProtocolMessage,
} from "@crosslab-ide/abstract-messaging-channel";
import {
  buildCompilationProtocol,
  CompilationProtocol,
  Directory,
  ResultFormatsDescriptor,
} from "@crosslab-ide/compilation-messaging-protocol";
import { CrossLabMessagingChannel } from "@crosslab-ide/crosslab-messaging-channel";
import { PromiseManager } from "./promiseManager.mjs";
import { v4 as uuidv4 } from "uuid";

export class CompilationService__Consumer<
  R extends ResultFormatsDescriptor = {}
> implements Service
{
  private _messagingChannel?: CrossLabMessagingChannel<
    CompilationProtocol<R>,
    "client"
  >;
  private _promiseManager: PromiseManager = new PromiseManager();
  private _compilationProtocol: CompilationProtocol<R>;
  serviceType: string = "https://api.goldi-labs.de/serviceTypes/compilation";
  serviceId: string;
  serviceDirection: ServiceDirection = "consumer";

  constructor(serviceId: string, resultFormatsDescription?: R) {
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
    console.log("setting up compilation service consumer!");
    const channel = new DataChannel();
    this._messagingChannel = new CrossLabMessagingChannel(
      channel,
      this._compilationProtocol,
      "client"
    );
    console.log(this._messagingChannel);
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
    ProtocolMessage<CompilationProtocol<R>, "compilation:response">["content"]
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
      !isProtocolMessage(
        this._compilationProtocol,
        "compilation:response",
        response
      )
    ) {
      throw new Error(
        'Received message is not of expected type "compilation:response"!'
      );
    }

    return response.content;
  }
}
