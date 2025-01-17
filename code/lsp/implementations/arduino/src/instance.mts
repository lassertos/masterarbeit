import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import fs from "fs";
import Queue from "queue";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import {
  LanguageServerMessagingProtocol,
  LanguageServerProducer,
} from "@crosslab-ide/crosslab-lsp-service";
import { configuration } from "./configuration.mjs";
import path from "path";
import { ProtocolMessage } from "../../../../shared/abstract-messaging-channel/dist/types.mjs";
import {
  DirectoryWithoutName,
  FileWithoutName,
} from "../../../../shared/filesystem-schemas/dist/normal.mjs";
import { URI } from "vscode-uri";

type InstanceData = {
  buffer: string;
  arduinoLanguageServerProcess?: ChildProcessWithoutNullStreams;
  localSrcUri?: URI;
  localSrcPath?: string;
  remoteSrcUri?: URI;
  remoteSrcPath?: string;
  rootPath?: string;
  tmpDirPath?: string;
  buildPath?: string;
  buildSketchRootPath?: string;
  fullBuildPath?: string;
  logPath: string;
  queue: Queue;
  openedDocuments: Set<string>;
  consumerId: string;
};

export class ArduinoCliLanguageServerInstance {
  private _deviceHandler: DeviceHandler;
  private _languageServerProducer: LanguageServerProducer;
  private _instanceUrl: string;
  private _deviceToken: string;
  private _consumers: Map<string, InstanceData> = new Map();

  constructor(instanceUrl: string, deviceToken: string) {
    this._instanceUrl = instanceUrl;
    this._deviceToken = deviceToken;

    this._deviceHandler = new DeviceHandler();

    this._languageServerProducer = new LanguageServerProducer("lsp");

    this._languageServerProducer.on("new-consumer", async (consumerId) => {
      const consumerInstanceData: InstanceData = {
        consumerId,
        buffer: "",
        logPath: fs.mkdtempSync("/tmp/arduino"),
        queue: new Queue({
          concurrency: 1,
          autostart: true,
        }),
        openedDocuments: new Set(),
      };
      this._consumers.set(consumerId, consumerInstanceData);

      this._languageServerProducer.on("message", async (cId, message) => {
        if (cId !== consumerId) return;

        if (message.type === "lsp:initialization:request") {
          consumerInstanceData.remoteSrcUri = URI.parse(
            message.content.sourceUri
          );
          consumerInstanceData.remoteSrcPath =
            consumerInstanceData.remoteSrcUri.path;
          if (
            consumerInstanceData.arduinoLanguageServerProcess &&
            typeof consumerInstanceData.arduinoLanguageServerProcess
              .exitCode !== "number"
          ) {
            consumerInstanceData.arduinoLanguageServerProcess.once(
              "exit",
              () => {
                this._startLanguageServer(
                  consumerInstanceData,
                  message.content.sourceDirectory
                );
              }
            );
            return;
          }
          this._startLanguageServer(
            consumerInstanceData,
            message.content.sourceDirectory
          );
        } else if (message.type === "lsp:message") {
          const parsedMessage = JSON.parse(message.content);
          if (parsedMessage.method === "initialize") {
            consumerInstanceData.rootPath =
              parsedMessage.params.rootUri.replace("file://", "") as string;
            const sketchPath = path.join(
              consumerInstanceData.rootPath,
              `${path.basename(consumerInstanceData.rootPath)}.ino`
            );
            if (!fs.existsSync(consumerInstanceData.rootPath)) {
              fs.mkdirSync(consumerInstanceData.rootPath, { recursive: true });
            }
            if (!fs.existsSync(sketchPath)) {
              fs.writeFileSync(sketchPath, "");
            }
          }
          consumerInstanceData.queue.push(async () => {
            await this._receiveMessage(
              consumerInstanceData,
              message.content,
              false
            );
          });
          if (parsedMessage.method === "initialized") {
            consumerInstanceData.queue.push(async () => {
              console.log("opening documents!");
              await this._openDocuments(
                consumerInstanceData,
                consumerInstanceData.localSrcPath!
              );
            });
          }
          return;
        } else if (message.type === "lsp:filesystem:read:request") {
          this._handleFilesystemReadRequest(consumerInstanceData, message);
        } else {
          this._handleFilesystemEvent(consumerInstanceData, message);
        }
      });
    });

    this._deviceHandler.addService(this._languageServerProducer);
  }

  public async connect() {
    const response = await fetch(
      configuration.WEBSOCKET_ENDPOINT.replace(
        "/websocket",
        `/${this._instanceUrl.split("/").at(-1)}/websocket`
      ),
      {
        method: "POST",
        headers: [["authorization", `Bearer ${this._deviceToken}`]],
      }
    );
    const token = await response.json();
    await this._deviceHandler.connect({
      endpoint: configuration.WEBSOCKET_ENDPOINT,
      id: this._instanceUrl,
      token: token,
    });
  }

  private _startLanguageServer(
    consumerInstanceData: InstanceData,
    sourceDirectory: DirectoryWithoutName
  ) {
    consumerInstanceData.tmpDirPath = undefined;
    consumerInstanceData.localSrcPath = undefined;
    consumerInstanceData.localSrcUri = undefined;
    consumerInstanceData.rootPath = undefined;
    consumerInstanceData.buildPath = undefined;
    consumerInstanceData.fullBuildPath = undefined;
    consumerInstanceData.buildSketchRootPath = undefined;
    consumerInstanceData.openedDocuments.clear();
    consumerInstanceData.arduinoLanguageServerProcess = spawn(
      "arduino-language-server",
      [
        "-clangd",
        "/usr/local/bin/clangd",
        "-cli",
        "/usr/local/bin/arduino-cli",
        "-cli-config",
        "/root/.arduino15/arduino-cli.yaml",
        "-fqbn",
        "arduino:avr:mega",
        "-log",
        "-logpath",
        `${consumerInstanceData.logPath}`,
      ]
    );
    consumerInstanceData.arduinoLanguageServerProcess.on("exit", (code) => {
      console.log(`arduino language server process exited with code ${code}`);
      if (code !== 0) {
        // TODO: handle crashed server
      }
    });
    consumerInstanceData.arduinoLanguageServerProcess.stdout.setEncoding(
      "utf-8"
    );
    consumerInstanceData.arduinoLanguageServerProcess.stderr.setEncoding(
      "utf-8"
    );

    consumerInstanceData.arduinoLanguageServerProcess.stdout.on(
      "data",
      (data) => {
        console.log(`data: ${data}`);
        this._addToBuffer(consumerInstanceData, data);
      }
    );

    consumerInstanceData.arduinoLanguageServerProcess.stderr.on(
      "data",
      async (data) => {
        console.error(`stderr: ${data}`);
        const hadTmpDir = !!consumerInstanceData.tmpDirPath;
        consumerInstanceData.tmpDirPath ??= data
          .match(/Language server temp directory: ([0-9a-zA-Z/-]*)/)
          ?.at(1);
        consumerInstanceData.buildPath ??= data
          .match(/Language server build path: ([0-9a-zA-Z/-]*)/)
          ?.at(1);
        consumerInstanceData.buildSketchRootPath ??= data
          .match(/Language server build sketch root: ([0-9a-zA-Z/-]*)/)
          ?.at(1);
        consumerInstanceData.fullBuildPath ??= data
          .match(/Language server FULL build path: ([0-9a-zA-Z/-]*)/)
          ?.at(1);

        if (consumerInstanceData.tmpDirPath && !hadTmpDir) {
          consumerInstanceData.localSrcPath = `${
            consumerInstanceData.tmpDirPath
          }/src/${consumerInstanceData.remoteSrcPath?.split("/").at(-1)}`;
          consumerInstanceData.localSrcUri = URI.parse(
            `file://${consumerInstanceData.localSrcPath}`
          );
          fs.mkdirSync(consumerInstanceData.localSrcPath, { recursive: true });
          this._recreateDirectory(
            consumerInstanceData.localSrcPath,
            sourceDirectory
          );
          await this._languageServerProducer.send(
            consumerInstanceData.consumerId,
            {
              type: "lsp:initialization:response",
              content: {
                configuration: {
                  documentSelector: [{ language: "cpp" }, { language: "c" }],
                },
              },
            }
          );
        }
      }
    );

    consumerInstanceData.arduinoLanguageServerProcess.on("close", (code) => {
      console.log(`arduino language server process closed with code ${code}`);
    });
  }

  private async _openDocuments(
    consumerInstanceData: InstanceData,
    directoryPath: string
  ) {
    console.log("DEBUGGING:", directoryPath);
    for (const entryName of fs.readdirSync(directoryPath)) {
      const entryPath = path.join(directoryPath, entryName);
      console.log("DEBUGGING:", entryPath);
      const stat = fs.statSync(entryPath);

      if (stat.isFile()) {
        console.log("DEBUGGING:", entryPath, "is file");
        console.log("DEBUGGING: opening", entryPath);
        const content = fs.readFileSync(entryPath);
        await this._receiveMessage(
          consumerInstanceData,
          JSON.stringify({
            jsonrpc: "2.0",
            method: "textDocument/didOpen",
            params: {
              textDocument: {
                uri: `file://${entryPath}`,
                languageId: "cpp",
                version: 1,
                text: new TextDecoder().decode(content),
              },
            },
          }),
          true
        );
        console.log("DEBUGGING: saving", entryPath);
        await this._receiveMessage(
          consumerInstanceData,
          JSON.stringify({
            jsonrpc: "2.0",
            method: "textDocument/didSave",
            params: {
              textDocument: {
                uri: `file://${entryPath}`,
              },
              text: new TextDecoder().decode(content),
            },
          }),
          true
        );
      } else {
        console.log("DEBUGGING:", entryPath, "is directory");
        await this._openDocuments(consumerInstanceData, entryPath);
      }
    }
  }

  private _recreateDirectory(
    directoryPath: string,
    directory: DirectoryWithoutName
  ) {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath);
    }

    for (const entryName in directory.content) {
      const entry = directory.content[entryName];
      const entryPath = path.join(directoryPath, entryName);
      if (entry.type === "file") {
        fs.writeFileSync(entryPath, entry.content);
      } else {
        this._recreateDirectory(entryPath, entry);
      }
    }
  }

  private _addToBuffer(consumerInstanceData: InstanceData, data: string) {
    consumerInstanceData.buffer = consumerInstanceData.buffer
      ? consumerInstanceData.buffer + data
      : data;
    this._checkBuffer(consumerInstanceData);
  }

  private _checkBuffer(consumerInstanceData: InstanceData) {
    if (!consumerInstanceData.buffer) return;
    if (consumerInstanceData.buffer.length === 0) return;

    const contentBeginIndex =
      consumerInstanceData.buffer.indexOf("\r\n\r\n") + 4;
    const contentLengthString = consumerInstanceData.buffer.slice(
      consumerInstanceData.buffer.indexOf(":") + 1,
      consumerInstanceData.buffer.indexOf("\r\n")
    );
    const contentString = consumerInstanceData.buffer.slice(contentBeginIndex);
    const byteArray = new TextEncoder().encode(contentString);
    const contentLength = parseInt(contentLengthString);
    const bytes = byteArray.slice(0, contentLength);

    if (bytes.length < contentLength) return;

    const message = new TextDecoder().decode(bytes);
    const rewrittenMessage = this._rewriteOutgoingUris(
      consumerInstanceData,
      message
    );

    console.log("sending message:", message);
    console.log("sending rewritten message:", rewrittenMessage);

    this._languageServerProducer.send(consumerInstanceData.consumerId, {
      type: "lsp:message",
      content: rewrittenMessage,
    });
    consumerInstanceData.buffer = new TextDecoder().decode(
      byteArray.slice(contentLength)
    );
    this._checkBuffer(consumerInstanceData);
  }

  private async _receiveMessage(
    consumerInstanceData: InstanceData,
    message: string,
    isLocal: boolean
  ) {
    console.log("receiving message:", message);
    const rewrittenMessage = this._rewriteIncomingUris(
      consumerInstanceData,
      message
    );
    console.log("receiving rewritten message:", rewrittenMessage);
    const parsedMessage = JSON.parse(rewrittenMessage);

    // ignore remote open and close messages
    if (
      !isLocal &&
      (parsedMessage.method === "textDocument/didOpen" ||
        parsedMessage.method === "textDocument/didClose")
    ) {
      return;
    }

    if (parsedMessage.method === "textDocument/didOpen") {
      if (
        consumerInstanceData.openedDocuments.has(
          parsedMessage.params.textDocument.uri
        )
      ) {
        return;
      }
      consumerInstanceData.openedDocuments.add(
        parsedMessage.params.textDocument.uri
      );
      console.log(
        "open documents:",
        JSON.stringify(Array.from(consumerInstanceData.openedDocuments))
      );
    }

    if (parsedMessage.method === "textDocument/didClose") {
      if (
        !consumerInstanceData.openedDocuments.has(
          parsedMessage.params.textDocument.uri
        )
      ) {
        return;
      }
      consumerInstanceData.openedDocuments.delete(
        parsedMessage.params.textDocument.uri
      );
      console.log(
        "open documents:",
        JSON.stringify(Array.from(consumerInstanceData.openedDocuments))
      );
    }

    if (parsedMessage.method === "textDocument/didSave") {
      await new Promise<void>((resolve, reject) => {
        fs.writeFile(
          parsedMessage.params.textDocument.uri.replace("file://", ""),
          parsedMessage.params.text,
          (error) => {
            if (error) reject(error);
            else resolve();
          }
        );
      });
    }

    const encodedMessage = new TextEncoder().encode(rewrittenMessage);
    consumerInstanceData.arduinoLanguageServerProcess?.stdin?.write(
      `Content-Length: ${encodedMessage.length}\r\n\r\n`
    );
    consumerInstanceData.arduinoLanguageServerProcess?.stdin?.write(
      rewrittenMessage
    );
  }

  private async _handleFilesystemEvent(
    consumerInstanceData: InstanceData,
    event:
      | ProtocolMessage<
          LanguageServerMessagingProtocol,
          "lsp:filesystem:event:created"
        >
      | ProtocolMessage<
          LanguageServerMessagingProtocol,
          "lsp:filesystem:event:changed"
        >
      | ProtocolMessage<
          LanguageServerMessagingProtocol,
          "lsp:filesystem:event:deleted"
        >
  ) {
    if (
      !consumerInstanceData.localSrcPath ||
      !consumerInstanceData.remoteSrcPath
    ) {
      console.error(
        `Local or remote src path is not set for consumer with id "${consumerInstanceData.consumerId}"!`
      );
      return;
    }

    const path = event.content.path.replace(
      consumerInstanceData.remoteSrcPath,
      consumerInstanceData.localSrcPath
    );

    switch (event.type) {
      case "lsp:filesystem:event:created":
        return await this._handleFilesystemCreatedEvent(
          consumerInstanceData,
          path,
          event.content.entry
        );
      case "lsp:filesystem:event:changed":
        return await this._handleFilesystemChangedEvent(
          consumerInstanceData,
          path,
          event.content.entry
        );
      case "lsp:filesystem:event:deleted":
        return await this._handleFilesystemDeletedEvent(
          consumerInstanceData,
          path
        );
    }
  }

  private async _handleFilesystemCreatedEvent(
    consumerInstanceData: InstanceData,
    path: string,
    entry: FileWithoutName | DirectoryWithoutName
  ) {
    if (entry.type === "file") {
      fs.writeFileSync(path, entry.content);
      await this._receiveMessage(
        consumerInstanceData,
        JSON.stringify({
          jsonrpc: "2.0",
          method: "textDocument/didOpen",
          params: {
            textDocument: {
              uri: `file://${path}`,
              languageId: "cpp",
              version: 1,
              text: new TextDecoder().decode(entry.content),
            },
          },
        }),
        true
      );
      await this._receiveMessage(
        consumerInstanceData,
        JSON.stringify({
          jsonrpc: "2.0",
          method: "textDocument/didSave",
          params: {
            textDocument: {
              uri: `file://${path}`,
            },
            text: new TextDecoder().decode(entry.content),
          },
        }),
        true
      );
    } else if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
  }

  private async _handleFilesystemChangedEvent(
    consumerInstanceData: InstanceData,
    path: string,
    entry: FileWithoutName | DirectoryWithoutName
  ) {
    if (entry.type === "directory") {
      return;
    }

    fs.writeFileSync(path, entry.content);

    await this._receiveMessage(
      consumerInstanceData,
      JSON.stringify({
        jsonrpc: "2.0",
        method: "textDocument/didSave",
        params: {
          textDocument: {
            uri: `file://${path}`,
          },
          text: new TextDecoder().decode(entry.content),
        },
      }),
      true
    );
  }

  private async _handleFilesystemDeletedEvent(
    consumerInstanceData: InstanceData,
    path: string
  ) {
    fs.rmSync(path, { force: true, recursive: true });
    await this._receiveMessage(
      consumerInstanceData,
      JSON.stringify({
        jsonrpc: "2.0",
        method: "textDocument/didClose",
        params: {
          textDocument: {
            uri: `file://${path}`,
          },
        },
      }),
      true
    );
  }

  private async _handleFilesystemReadRequest(
    consumerInstanceData: InstanceData,
    request: ProtocolMessage<
      LanguageServerMessagingProtocol,
      "lsp:filesystem:read:request"
    >
  ) {
    if (!fs.existsSync(request.content.path)) {
      return await this._languageServerProducer.send(
        consumerInstanceData.consumerId,
        {
          type: "lsp:filesystem:read:response",
          content: {
            requestId: request.content.requestId,
            success: false,
          },
        }
      );
    }
    const stat = fs.statSync(request.content.path);
    if (!stat.isFile()) {
      return await this._languageServerProducer.send(
        consumerInstanceData.consumerId,
        {
          type: "lsp:filesystem:read:response",
          content: {
            requestId: request.content.requestId,
            success: false,
          },
        }
      );
    }
    const content = fs.readFileSync(request.content.path, {
      encoding: "utf-8",
    });
    await this._receiveMessage(
      consumerInstanceData,
      JSON.stringify({
        jsonrpc: "2.0",
        method: "textDocument/didOpen",
        params: {
          textDocument: {
            uri: `file://${request.content.path}`,
            languageId: "cpp",
            version: 1,
            text: content,
          },
        },
      }),
      true
    );
    await this._languageServerProducer.send(consumerInstanceData.consumerId, {
      type: "lsp:filesystem:read:response",
      content: {
        requestId: request.content.requestId,
        success: true,
        content,
      },
    });
  }

  private _rewriteIncomingUris(
    consumerInstanceData: InstanceData,
    message: string
  ): string {
    console.log("local:", consumerInstanceData.localSrcUri?.toString());
    console.log("remote:", consumerInstanceData.remoteSrcUri?.toString());
    if (
      !consumerInstanceData.localSrcUri ||
      !consumerInstanceData.remoteSrcUri
    ) {
      console.error(
        `Local or remote src uri is not set for consumer with id "${consumerInstanceData.consumerId}"!`
      );
      return message;
    }

    return message.replaceAll(
      consumerInstanceData.remoteSrcUri.toString(),
      consumerInstanceData.localSrcUri.toString()
    );
  }

  private _rewriteOutgoingUris(
    consumerInstanceData: InstanceData,
    message: string
  ): string {
    console.log("local:", consumerInstanceData.localSrcUri?.toString());
    console.log("remote:", consumerInstanceData.remoteSrcUri?.toString());
    if (
      !consumerInstanceData.localSrcUri ||
      !consumerInstanceData.remoteSrcUri
    ) {
      console.error(
        `Local or remote src uri is not set for consumer with id "${consumerInstanceData.consumerId}"!`
      );
      return message;
    }

    return message.replaceAll(
      consumerInstanceData.localSrcUri.toString(),
      consumerInstanceData.remoteSrcUri.toString()
    );
  }
}
