import { CrossLabMessagingChannel } from "@crosslab-ide/crosslab-messaging-channel";
import {
  DataChannel,
  PeerConnection,
  Service,
  ServiceConfiguration,
  ServiceDirection,
} from "@crosslab-ide/soa-client";
import {
  LanguageServerMessagingProtocol,
  languageServerMessagingProtocol,
} from "./protocol.mjs";
import { v4 as uuidv4 } from "uuid";
import {
  IncomingMessage,
  isProtocolMessage,
  ProtocolMessage,
} from "@crosslab-ide/abstract-messaging-channel";
import { TypedEmitter } from "tiny-typed-emitter";
import { PromiseManager } from "./promiseManager.mjs";

export interface LanguageServerConsumerEvents {
  "new-producer": (
    producerId: string,
    info: ProtocolMessage<
      LanguageServerMessagingProtocol,
      "lsp:initialization:response"
    >["content"]
  ) => void;
  message: (
    producerId: string,
    message: IncomingMessage<LanguageServerMessagingProtocol, "client">
  ) => void;
}

export class LanguageServerConsumer
  extends TypedEmitter<LanguageServerConsumerEvents>
  implements Service
{
  private _producers: Map<
    string,
    CrossLabMessagingChannel<LanguageServerMessagingProtocol, "client">
  > = new Map();
  private _promiseManager: PromiseManager = new PromiseManager();
  serviceType: string = "https://api.goldi-labs.de/serviceTypes/lsp";
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
      supportedConnectionTypes: ["websocket", "webrtc", "local"],
    };
  }

  setupConnection(
    connection: PeerConnection,
    serviceConfiguration: ServiceConfiguration
  ): void {
    const channel = new DataChannel();
    const messagingChannel = new CrossLabMessagingChannel(
      channel,
      languageServerMessagingProtocol,
      "client"
    );

    const producerId = uuidv4();
    this._producers.set(producerId, messagingChannel);

    messagingChannel.once("ready", async () => {
      const initializationResponse = await this.initialize(producerId);

      messagingChannel.on("message", (message) => {
        if (
          message.type === "lsp:filesystem:write-file:response" ||
          message.type === "lsp:filesystem:create-directory:response" ||
          message.type === "lsp:filesystem:delete:response" ||
          message.type === "lsp:filesystem:read:response"
        ) {
          this._promiseManager.resolve(message.content.requestId, message);
        }
        this.emit("message", producerId, message);
      });

      this.emit("new-producer", producerId, initializationResponse.content);
    });

    messagingChannel.on("close", () => {});

    if (connection.tiebreaker) {
      connection.transmit(serviceConfiguration, "data", channel);
    } else {
      connection.receive(serviceConfiguration, "data", channel);
    }
  }

  async writeFile(producerId: string, path: string, content: string) {
    const producer = this._producers.get(producerId);
    if (!producer) {
      throw new Error(`Could not find producer with id "${producerId}"!`);
    }

    const requestId = uuidv4();

    const responsePromise = this._promiseManager.add(requestId);

    await producer.send({
      type: "lsp:filesystem:write-file:request",
      content: {
        requestId,
        path,
        content,
      },
    });

    const response = await responsePromise;

    if (
      !isProtocolMessage(
        languageServerMessagingProtocol,
        "lsp:filesystem:write-file:response",
        response
      )
    ) {
      throw new Error(
        `Did not receive valid response of type "lsp:filesystem:write-file:response"!`
      );
    }

    if (!response.content.success) {
      throw new Error(
        response.content.message ??
          `Something went wrong while trying to write file at path "${path}" of producer "${producerId}"!`
      );
    }
  }

  async createDirectory(producerId: string, path: string) {
    const producer = this._producers.get(producerId);
    if (!producer) {
      throw new Error(`Could not find producer with id "${producerId}"!`);
    }

    const requestId = uuidv4();

    const responsePromise = this._promiseManager.add(requestId);

    await producer.send({
      type: "lsp:filesystem:create-directory:request",
      content: {
        requestId,
        path,
      },
    });

    const response = await responsePromise;

    if (
      !isProtocolMessage(
        languageServerMessagingProtocol,
        "lsp:filesystem:create-directory:response",
        response
      )
    ) {
      throw new Error(
        `Did not receive valid response of type "lsp:filesystem:create-directory:response"!`
      );
    }

    if (!response.content.success) {
      throw new Error(
        response.content.message ??
          `Something went wrong while trying to create directory at path "${path}" of producer "${producerId}"!`
      );
    }
  }

  async delete(producerId: string, path: string) {
    const producer = this._producers.get(producerId);
    if (!producer) {
      throw new Error(`Could not find producer with id "${producerId}"!`);
    }

    const requestId = uuidv4();

    const responsePromise = this._promiseManager.add(requestId);

    await producer.send({
      type: "lsp:filesystem:delete:request",
      content: {
        requestId,
        path,
      },
    });

    const response = await responsePromise;

    if (
      !isProtocolMessage(
        languageServerMessagingProtocol,
        "lsp:filesystem:delete:response",
        response
      )
    ) {
      throw new Error(
        `Did not receive valid response of type "lsp:filesystem:delete:response"!`
      );
    }

    if (!response.content.success) {
      throw new Error(
        response.content.message ??
          `Something went wrong while trying to delete entry at path "${path}" of producer "${producerId}"!`
      );
    }
  }

  async readFile(producerId: string, path: string) {
    const producer = this._producers.get(producerId);
    if (!producer) {
      throw new Error(`Could not find producer with id "${producerId}"!`);
    }

    const requestId = uuidv4();

    const responsePromise = this._promiseManager.add(requestId);

    await producer.send({
      type: "lsp:filesystem:read:request",
      content: {
        requestId,
        path,
      },
    });

    const response = await responsePromise;

    if (
      !isProtocolMessage(
        languageServerMessagingProtocol,
        "lsp:filesystem:read:response",
        response
      )
    ) {
      throw new Error(
        `Did not receive valid response of type "lsp:filesystem:read:response"!`
      );
    }

    if (!response.content.success) {
      throw new Error(
        response.content.message ??
          `Something went wrong while trying to delete entry at path "${path}" of producer "${producerId}"!`
      );
    }

    return response.content;
  }

  async sendLspMessage(producerId: string, message: string) {
    const producer = this._producers.get(producerId);
    if (!producer) {
      throw new Error(`Could not find producer with id "${producerId}"!`);
    }

    await producer.send({
      type: "lsp:message",
      content: message,
    });
  }

  async initialize(producerId: string) {
    const producer = this._producers.get(producerId);
    if (!producer) {
      throw new Error(`Could not find producer with id "${producerId}"!`);
    }

    const initializationResponsePromise = new Promise<
      ProtocolMessage<
        LanguageServerMessagingProtocol,
        "lsp:initialization:response"
      >
    >((resolve) => {
      const listener = (
        message: IncomingMessage<LanguageServerMessagingProtocol, "client">
      ) => {
        if (message.type === "lsp:initialization:response") {
          resolve(message);
        }
      };
      producer.on("message", listener);
    });

    await producer.send({
      type: "lsp:initialization:request",
      content: undefined,
    });

    return await initializationResponsePromise;
  }
}
