import {
  DataChannel,
  PeerConnection,
  Service,
  ServiceConfiguration,
  ServiceDirection,
} from "@crosslab-ide/soa-client";
import { CrossLabMessagingChannel } from "@crosslab-ide/crosslab-messaging-channel";
import { TypedEmitter } from "tiny-typed-emitter";
import {
  fileSystemProtocol,
  FileSystemProtocol,
} from "@crosslab-ide/filesystem-messaging-protocol";
import {
  IncomingMessage,
  OutgoingMessage,
} from "@crosslab-ide/abstract-messaging-channel";
import { isTemplatesArray, TemplatesArray } from "./types.mjs";

interface FileSystemService__ProducerEvents {
  templates: (templates: TemplatesArray) => void;
  request: (request: IncomingMessage<FileSystemProtocol, "producer">) => void;
}

export class FileSystemService__Producer
  extends TypedEmitter<FileSystemService__ProducerEvents>
  implements Service
{
  private _messagingChannel?: CrossLabMessagingChannel<
    FileSystemProtocol,
    "producer"
  >;
  serviceType: string = "https://api.goldi-labs.de/serviceTypes/filesystem";
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
    console.log("setting up filesystem service producer!");
    if ("templates" in serviceConfig) {
      if (isTemplatesArray(serviceConfig.templates)) {
        this.emit("templates", serviceConfig.templates);
      }
    }
    const channel = new DataChannel();
    this._messagingChannel = new CrossLabMessagingChannel(
      channel,
      fileSystemProtocol,
      "producer"
    );
    console.log(this._messagingChannel);
    this._messagingChannel.on("message", (message) => {
      console.log("emitting request", message);
      this.emit("request", message);
    });
    if (connection.tiebreaker) {
      connection.transmit(serviceConfig, "data", channel);
    } else {
      connection.receive(serviceConfig, "data", channel);
    }
  }

  async send(message: OutgoingMessage<FileSystemProtocol, "producer">) {
    if (!this._messagingChannel) {
      throw new Error("No messaging channel has been set up!");
    }

    await this._messagingChannel.send(message);
  }
}
