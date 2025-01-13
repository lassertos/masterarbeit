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
import { Directory } from "@crosslab-ide/filesystem-schemas";
import { PromiseManager } from "@crosslab-ide/promise-manager";
import { v4 as uuidv4 } from "uuid";

interface DebuggingAdapterServiceConsumerEvents {
  "new-producer": (producerId: string) => void;
  message: (
    producerId: string,
    message: IncomingMessage<DebuggingAdapterProtocol, "client">
  ) => void;
}

export class DebuggingAdapterServiceConsumer
  extends TypedEmitter<DebuggingAdapterServiceConsumerEvents>
  implements Service
{
  private _producers: Map<
    string,
    CrossLabMessagingChannel<DebuggingAdapterProtocol, "client">
  > = new Map();
  private _promiseManager: PromiseManager = new PromiseManager();
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
    const messagingChannel = new CrossLabMessagingChannel(
      channel,
      debuggingAdapterProtocol,
      "client"
    );

    const producerId = uuidv4();
    this._producers.set(producerId, messagingChannel);

    messagingChannel.on("message", (message) => {
      console.log("emitting debug adapter message", message);

      if (
        message.type === "session:start:response" ||
        message.type === "session:join:response"
      ) {
        return this._promiseManager.resolve(message.content.requestId, message);
      }

      this.emit("message", producerId, message);
    });

    this.emit("new-producer", producerId);

    if (connection.tiebreaker) {
      connection.transmit(serviceConfig, "data", channel);
    } else {
      connection.receive(serviceConfig, "data", channel);
    }
  }

  async send(
    producerId: string,
    message: OutgoingMessage<DebuggingAdapterProtocol, "client">
  ) {
    const producer = this._producers.get(producerId);
    if (!producer) {
      throw new Error(`Could not find producer with id "${producerId}"!`);
    }
    await producer.send(message);
  }

  async startSession(
    producerId: string,
    session: {
      configuration: Record<string, unknown>;
      directory: Directory;
    }
  ) {
    const producer = this._producers.get(producerId);
    if (!producer) {
      throw new Error(`Could not find producer with id "${producerId}"!`);
    }

    const requestId = uuidv4();

    await producer.send({
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

  async joinSession(producerId: string, sessionId: string) {
    const producer = this._producers.get(producerId);
    if (!producer) {
      throw new Error(`Could not find producer with id "${producerId}"!`);
    }

    const requestId = uuidv4();

    await producer.send({
      type: "session:join:request",
      content: { requestId, sessionId },
    });

    const response = await this._promiseManager.add(requestId);

    if (
      !isProtocolMessage(
        debuggingAdapterProtocol,
        "session:join:response",
        response
      )
    ) {
      throw new Error(
        'Received response is not a valid "session:join:response" message!'
      );
    }

    if (!response.content.success) {
      throw new Error(
        response.content.message ??
          `Something went wrong while trying to join the debugging session with id "${sessionId}"!`
      );
    }

    return {
      sessionId: response.content.sessionId,
      configuration: response.content.configuration,
    };
  }
}
