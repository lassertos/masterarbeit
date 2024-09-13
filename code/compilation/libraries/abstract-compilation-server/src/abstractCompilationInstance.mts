import {
  AbstractMessagingChannel,
  IncomingMessage,
  isIncomingMessage,
  ProtocolMessage,
} from "messaging-channels";
import { compilationProtocol, CompilationProtocol } from "compilation-protocol";

export abstract class AbstractCompilationInstance {
  protected messagingChannel: AbstractMessagingChannel<
    CompilationProtocol,
    "server"
  >;

  constructor(
    messagingChannel: AbstractMessagingChannel<CompilationProtocol, "server">
  ) {
    this.messagingChannel = messagingChannel;
    this.messagingChannel.on("message", (message) =>
      this.handleMessage(message)
    );
  }

  handleMessage(message: IncomingMessage<CompilationProtocol, "server">) {
    if (!isIncomingMessage(compilationProtocol, "server", message)) {
      throw new Error(
        `Incoming message does not conform to compilation protocol!`
      );
    }

    switch (message.type) {
      case "compilation:request": {
        return this.handleCompilationRequest(message);
      }

      default: {
        throw new Error(`Unknown message type "${message.type}"!`);
      }
    }
  }

  abstract handleCompilationRequest(
    compilationRequest: ProtocolMessage<
      CompilationProtocol,
      "compilation:request"
    >
  ): ProtocolMessage<CompilationProtocol, "compilation:response">;
}
