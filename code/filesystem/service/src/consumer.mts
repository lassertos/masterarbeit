import {
  DataChannel,
  PeerConnection,
  Service,
  ServiceConfiguration,
  ServiceDirection,
} from "@crosslab-ide/soa-client";
import { CrossLabMessagingChannel } from "@crosslab-ide/crosslab-messaging-channel";
import {
  Directory,
  File,
  fileSystemProtocol,
  FileSystemProtocol,
} from "@crosslab-ide/filesystem-messaging-protocol";
import {
  IncomingMessage,
  isProtocolMessage,
  ProtocolMessage,
} from "@crosslab-ide/abstract-messaging-channel";
import { v4 as uuidv4 } from "uuid";
import { TypedEmitter } from "tiny-typed-emitter";
import { PromiseManager } from "./promiseManager.mjs";

interface FileSystemWatcherEvents {
  changed: (
    path: string,
    entry: Directory["content"] | File["content"]
  ) => void;
  created: (path: string, content: Directory | File) => void;
  deleted: (path: string) => void;
  moved: (oldPath: string, newPath: string) => void;
}

export class FileSystemService__Consumer implements Service {
  private _messagingChannel?: CrossLabMessagingChannel<
    FileSystemProtocol,
    "consumer"
  >;
  private _promiseManager: PromiseManager = new PromiseManager();
  private _fileSystemWatchers: Map<
    string,
    TypedEmitter<FileSystemWatcherEvents>
  > = new Map();
  serviceType: string = "https://api.goldi-labs.de/serviceTypes/filesystem";
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
    console.log("setting up filesystem service consumer!");
    const channel = new DataChannel();
    this._messagingChannel = new CrossLabMessagingChannel(
      channel,
      fileSystemProtocol,
      "consumer"
    );
    console.log(this._messagingChannel);
    this._messagingChannel.on("message", (message) =>
      this._handleIncomingMessage(message)
    );
    if (connection.tiebreaker) {
      connection.transmit(serviceConfig, "data", channel);
    } else {
      connection.receive(serviceConfig, "data", channel);
    }
  }

  private _handleIncomingMessage(
    message: IncomingMessage<FileSystemProtocol, "consumer">
  ) {
    console.log("received incoming message", message);
    switch (message.type) {
      case "createDirectory:response":
        this._promiseManager.resolve(message.content.requestId, message);
        break;
      case "delete:response":
        this._promiseManager.resolve(message.content.requestId, message);
        break;
      case "move:response":
        this._promiseManager.resolve(message.content.requestId, message);
        break;
      case "readDirectory:response":
        this._promiseManager.resolve(message.content.requestId, message);
        break;
      case "readFile:response":
        this._promiseManager.resolve(message.content.requestId, message);
        break;
      case "unwatch:response":
        this._promiseManager.resolve(message.content.requestId, message);
        break;
      case "watch:response":
        this._promiseManager.resolve(message.content.requestId, message);
        break;
      case "watch-event":
        const fileSystemWatcher = this._fileSystemWatchers.get(
          message.content.watcherId
        );

        switch (message.content.type) {
          case "changed":
            fileSystemWatcher?.emit(
              "changed",
              message.content.path,
              message.content.newContent
            );
            break;
          case "moved":
            fileSystemWatcher?.emit(
              "moved",
              message.content.oldPath,
              message.content.newPath
            );
            break;
          case "created":
            fileSystemWatcher?.emit(
              "created",
              message.content.path,
              message.content.entry
            );
            break;
          case "deleted":
            fileSystemWatcher?.emit("deleted", message.content.path);
            break;
        }
        break;
      case "writeFile:response":
        this._promiseManager.resolve(message.content.requestId, message);
        break;
    }
  }

  async createDirectory(path: string, content?: (Directory | File)[]) {
    if (!this._messagingChannel) {
      throw new Error("No messaging channel has been set up!");
    }

    const requestId = uuidv4();
    const promise = this._promiseManager.add(requestId);

    await this._messagingChannel.send({
      type: "createDirectory:request",
      content: { requestId, path, content },
    });

    const response = await promise;

    this._parseResponse(response, "createDirectory:response");
  }

  async delete(path: string) {
    if (!this._messagingChannel) {
      throw new Error("No messaging channel has been set up!");
    }

    const requestId = uuidv4();
    const promise = this._promiseManager.add(requestId);

    await this._messagingChannel.send({
      type: "delete:request",
      content: { requestId, path },
    });

    const response = await promise;

    this._parseResponse(response, "delete:response");
  }

  async move(path: string, newPath: string) {
    if (!this._messagingChannel) {
      throw new Error("No messaging channel has been set up!");
    }

    const requestId = uuidv4();
    const promise = this._promiseManager.add(requestId);

    await this._messagingChannel.send({
      type: "move:request",
      content: { requestId, path, newPath },
    });

    const response = await promise;

    this._parseResponse(response, "move:response");
  }

  async readDirectory(path: string): Promise<Directory> {
    if (!this._messagingChannel) {
      throw new Error("No messaging channel has been set up!");
    }

    const requestId = uuidv4();
    const promise = this._promiseManager.add(requestId);

    console.log("sending readDirectory request!", {
      type: "readDirectory:request",
      content: { requestId, path },
    });

    await this._messagingChannel.send({
      type: "readDirectory:request",
      content: { requestId, path },
    });

    console.log("awaiting response!");

    const response = await promise;

    console.log("received response!", response);

    this._parseResponse(response, "readDirectory:response");

    return response.content.directory;
  }

  async readFile(path: string): Promise<File> {
    if (!this._messagingChannel) {
      throw new Error("No messaging channel has been set up!");
    }

    const requestId = uuidv4();
    const promise = this._promiseManager.add(requestId);

    await this._messagingChannel.send({
      type: "readFile:request",
      content: { requestId, path },
    });

    const response = await promise;

    this._parseResponse(response, "readFile:response");

    return response.content.file;
  }

  async watch(path?: string): Promise<TypedEmitter<FileSystemWatcherEvents>> {
    if (!this._messagingChannel) {
      throw new Error("No messaging channel has been set up!");
    }

    const requestId = uuidv4();
    const promise = this._promiseManager.add(requestId);

    await this._messagingChannel.send({
      type: "watch:request",
      content: { requestId, path },
    });

    const response = await promise;

    this._parseResponse(response, "watch:response");

    const fileSystemWatcher = new TypedEmitter();

    this._fileSystemWatchers.set(response.content.watcherId, fileSystemWatcher);

    return fileSystemWatcher;
  }

  async writeFile(path: string, content: string) {
    if (!this._messagingChannel) {
      throw new Error("No messaging channel has been set up!");
    }

    const requestId = uuidv4();
    const promise = this._promiseManager.add(requestId);

    await this._messagingChannel.send({
      type: "writeFile:request",
      content: { requestId, path, content },
    });

    const response = await promise;

    this._parseResponse(response, "writeFile:response");
  }

  private _parseResponse<
    MT extends Exclude<
      IncomingMessage<FileSystemProtocol, "consumer">["type"],
      "watch-event"
    >
  >(
    response: unknown,
    messageType: MT
  ): asserts response is ProtocolMessage<FileSystemProtocol, MT> & {
    content: { success: true };
  } {
    if (!isProtocolMessage(fileSystemProtocol, messageType, response)) {
      throw new Error(
        `Did not receive response with expected type "${messageType}"!`
      );
    }

    if (!response.content.success) {
      throw new Error(
        `Request of type "${messageType.replace(
          "response",
          "request"
        )}" with id "${response.content.requestId}" was unsuccessful! ${
          response.content.message ? `Message: ${response.content.message}` : ""
        }`
      );
    }
  }
}
