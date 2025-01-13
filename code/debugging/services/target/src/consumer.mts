import { CrossLabMessagingChannel } from "@crosslab-ide/crosslab-messaging-channel";
import {
  DataChannel,
  PeerConnection,
  Service,
  ServiceConfiguration,
  ServiceDirection,
} from "@crosslab-ide/soa-client";
import {
  debuggingTargetProtocol,
  DebuggingTargetProtocol,
} from "./protocol.mjs";
import { isProtocolMessage } from "@crosslab-ide/abstract-messaging-channel";
import { v4 as uuidv4 } from "uuid";
import { PromiseManager } from "@crosslab-ide/promise-manager";

export class DebuggingTargetServiceConsumer implements Service {
  private _messagingChannel?: CrossLabMessagingChannel<
    DebuggingTargetProtocol,
    "client"
  >;
  private _promiseManager: PromiseManager = new PromiseManager();
  serviceType: string =
    "https://api.goldi-labs.de/serviceTypes/debugging-target";
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
      debuggingTargetProtocol,
      "client"
    );
    this._messagingChannel.on("message", (message) => {
      this._promiseManager.resolve(message.content.requestId, message);
    });
    if (connection.tiebreaker) {
      connection.transmit(serviceConfig, "data", channel);
    } else {
      connection.receive(serviceConfig, "data", channel);
    }
  }

  async startDebugging(program: Uint8Array<ArrayBuffer>) {
    if (!this._messagingChannel) {
      throw new Error("No messaging channel has been set up!");
    }

    const requestId = uuidv4();

    this._messagingChannel.send({
      type: "debugging:start:request",
      content: {
        requestId,
        program,
      },
    });

    const response = await this._promiseManager.add(requestId);

    if (
      !isProtocolMessage(
        debuggingTargetProtocol,
        "debugging:start:response",
        response
      )
    ) {
      throw new Error(
        'The received response is not a valid "debugging:start:response" message!'
      );
    }

    if (!response.content.success) {
      throw new Error(
        `Debugging could not be started: ${
          response.content.message ?? "cause unknown"
        }`
      );
    }
  }

  async endDebugging() {
    if (!this._messagingChannel) {
      throw new Error("No messaging channel has been set up!");
    }

    const requestId = uuidv4();

    this._messagingChannel.send({
      type: "debugging:end:request",
      content: {
        requestId,
      },
    });

    const response = await this._promiseManager.add(requestId);

    if (
      !isProtocolMessage(
        debuggingTargetProtocol,
        "debugging:end:response",
        response
      )
    ) {
      throw new Error(
        'The received response is not a valid "debugging:end:response" message!'
      );
    }

    if (!response.content.success) {
      throw new Error(
        `Debugging could not be ended: ${
          response.content.message ?? "cause unknown"
        }`
      );
    }
  }
}
