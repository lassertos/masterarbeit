import { JSONSchemaType } from "ajv";
import { AbstractLanguageServerInstance } from "../abstractLanguageServerInstance";
import { WebSocketConnectionOptions } from "../../connectionOptions/webSocketConnectionOption";
import { CrossLabConnectionOptions } from "../../connectionOptions/crossLabConnectionOptions";
import { WebSocketMessageChannel } from "../../messageChannels/webSocketMessageChannel";
import { CrossLabMessageChannel } from "../../messageChannels/crossLabMessageChannel";
import { MessageChannel } from "../../messageChannels/messageChannel";
import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import { StdioMessageChannel } from "../../messageChannels/stdioMessageChannel";

export type AvrLanguageServerInstanceOptions = {
  frequency: string;
  mcu: string;
};

export const AvrLanguageServerInstanceOptionsSchema: JSONSchemaType<AvrLanguageServerInstanceOptions> =
  {
    type: "object",
    properties: {
      frequency: { type: "string" },
      mcu: { type: "string" },
    },
    required: ["frequency", "mcu"],
  };

export class AvrLanguageServerInstance extends AbstractLanguageServerInstance<AvrLanguageServerInstanceOptions> {
  _messageChannelClient: MessageChannel;
  _messageChannelServer: MessageChannel;
  _clangdProcess: ChildProcessWithoutNullStreams;

  constructor(options: {
    connection: WebSocketConnectionOptions | CrossLabConnectionOptions;
    instance: AvrLanguageServerInstanceOptions;
  }) {
    super();

    switch (options.connection.type) {
      case "webSocket":
        this._messageChannelClient = new WebSocketMessageChannel(
          options.connection
        );
        break;
      case "crossLab":
        this._messageChannelClient = new CrossLabMessageChannel(
          options.connection
        );
        break;
    }

    this._clangdProcess = spawn("clangd", [], {});

    this._messageChannelServer = new StdioMessageChannel({
      in: this._clangdProcess.stdin,
      out: this._clangdProcess.stdout,
    });
  }
}
