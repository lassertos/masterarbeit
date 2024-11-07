import { CrossLabMessagingChannel } from "@crosslab-ide/crosslab-messaging-channel";
import {
  DataChannel,
  PeerConnection,
  Service,
  ServiceConfiguration,
  ServiceDirection,
} from "@crosslab-ide/soa-client";
import {
  debuggingAdapterProtocol,
  DebuggingAdapterProtocol,
} from "./protocol.mjs";
import {
  IncomingMessage,
  isProtocolMessage,
  OutgoingMessage,
} from "@crosslab-ide/abstract-messaging-channel";
import { TypedEmitter } from "tiny-typed-emitter";
import { Directory } from "./types.mjs";
import { PromiseManager } from "./promiseManager.mjs";
import { v4 as uuidv4 } from "uuid";

interface DebuggingAdapterServiceConsumerEvents {
  message: (
    message: IncomingMessage<DebuggingAdapterProtocol, "client">
  ) => void;
}

export class DebuggingAdapterServiceConsumer
  extends TypedEmitter<DebuggingAdapterServiceConsumerEvents>
  implements Service
{
  private _promiseManager: PromiseManager = new PromiseManager();
  private _messagingChannel?: CrossLabMessagingChannel<
    DebuggingAdapterProtocol,
    "client"
  >;
  serviceType: string =
    "https://api.goldi-labs.de/serviceTypes/debugging-adapter";
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
      debuggingAdapterProtocol,
      "client"
    );
    this._messagingChannel.on("message", (message) => {
      console.log("emitting debug adapter message", message);

      if (message.type === "session:start:response") {
        return this._promiseManager.resolve(message.content.requestId, message);
      }

      this.emit("message", message);
    });
    if (connection.tiebreaker) {
      connection.transmit(serviceConfig, "data", channel);
    } else {
      connection.receive(serviceConfig, "data", channel);
    }
  }

  async send(message: OutgoingMessage<DebuggingAdapterProtocol, "client">) {
    if (!this._messagingChannel) {
      throw new Error("No messaging channel has been set up!");
    }
    await this._messagingChannel.send(message);
  }

  async startSession(session: {
    configuration: Record<string, unknown>;
    directory: Directory;
  }) {
    if (!this._messagingChannel) {
      throw new Error("No messaging channel has been set up!");
    }

    const requestId = uuidv4();

    await this._messagingChannel.send({
      type: "session:start:request",
      content: { requestId, ...session },
    });

    const response = await this._promiseManager.add(requestId);

    if (
      !isProtocolMessage(
        debuggingAdapterProtocol,
        "session:start:response",
        response
      )
    ) {
      throw new Error(
        'Received response is not a valid "session:start:response" message!'
      );
    }

    if (!response.content.success) {
      throw new Error(
        response.content.message ??
          "Something went wrong while trying to start the debugging session!"
      );
    }

    return {
      sessionId: response.content.sessionId,
      configuration: response.content.configuration,
    };
  }
}
