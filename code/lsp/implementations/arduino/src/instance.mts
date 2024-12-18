import { ChildProcessWithoutNullStreams, spawn } from "child_process";
import fs from "fs";
import Queue from "queue";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import { LanguageServerProducer } from "@crosslab-ide/crosslab-lsp-service";
import { configuration } from "./configuration.mjs";
import path from "path";

type InstanceData = {
  buffer: string;
  arduinoLanguageServerProcess?: ChildProcessWithoutNullStreams;
  srcPath?: string;
  rootPath?: string;
  tmpDirPath?: string;
  buildPath?: string;
  buildSketchRootPath?: string;
  fullBuildPath?: string;
  logPath: string;
  queue: Queue;
  openedDocuments: Set<string>;
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
      this._consumers.set(consumerId, {
        buffer: "",
        logPath: fs.mkdtempSync("/tmp/arduino"),
        queue: new Queue({
          concurrency: 1,
          autostart: true,
        }),
        openedDocuments: new Set(),
      });
    });

    this._languageServerProducer.on("message", async (consumerId, message) => {
      const consumerInstanceData = this._consumers.get(consumerId);

      if (!consumerInstanceData) {
        console.error(
          `Could not find instance data for consumer with id "${consumerId}"!`
        );
        return;
      }

      if (message.type === "lsp:initialization:request") {
        if (
          consumerInstanceData.arduinoLanguageServerProcess &&
          typeof consumerInstanceData.arduinoLanguageServerProcess.exitCode !==
            "number"
        ) {
          consumerInstanceData.arduinoLanguageServerProcess.once("exit", () => {
            consumerInstanceData.tmpDirPath = undefined;
            consumerInstanceData.srcPath = undefined;
            consumerInstanceData.rootPath = undefined;
            consumerInstanceData.buildPath = undefined;
            consumerInstanceData.fullBuildPath = undefined;
            consumerInstanceData.buildSketchRootPath = undefined;
            this._startLanguageServer(consumerId);
          });
          return;
        }
        this._startLanguageServer(consumerId);
      } else if (message.type === "lsp:message") {
        const parsedMessage = JSON.parse(message.content);
        if (parsedMessage.method === "initialize") {
          consumerInstanceData.rootPath = parsedMessage.params.rootUri.replace(
            "file://",
            ""
          ) as string;
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
        return consumerInstanceData.queue.push(async () => {
          await this._receiveMessage(consumerId, message.content, false);
        });
      } else if (message.type === "lsp:filesystem:write-file:request") {
        if (
          !message.content.path.startsWith(consumerInstanceData.srcPath + "/")
        ) {
          return await this._languageServerProducer.send(consumerId, {
            type: "lsp:filesystem:write-file:response",
            content: {
              requestId: message.content.requestId,
              success: false,
            },
          });
        }
        fs.writeFileSync(message.content.path, message.content.content);
        await this._receiveMessage(
          consumerId,
          JSON.stringify({
            jsonrpc: "2.0",
            method: "textDocument/didOpen",
            params: {
              textDocument: {
                uri: `file://${message.content.path}`,
                languageId: "cpp",
                version: 1,
                text: message.content.content,
              },
            },
          }),
          true
        );
        await this._receiveMessage(
          consumerId,
          JSON.stringify({
            jsonrpc: "2.0",
            method: "textDocument/didSave",
            params: {
              textDocument: {
                uri: `file://${message.content.path}`,
              },
              text: message.content.content,
            },
          }),
          true
        );
        await this._languageServerProducer.send(consumerId, {
          type: "lsp:filesystem:write-file:response",
          content: {
            requestId: message.content.requestId,
            success: true,
          },
        });
      } else if (message.type === "lsp:filesystem:create-directory:request") {
        if (
          !message.content.path.startsWith(consumerInstanceData.srcPath + "/")
        ) {
          return await this._languageServerProducer.send(consumerId, {
            type: "lsp:filesystem:create-directory:response",
            content: {
              requestId: message.content.requestId,
              success: false,
            },
          });
        }
        if (!fs.existsSync(message.content.path)) {
          fs.mkdirSync(message.content.path);
        }
        await this._languageServerProducer.send(consumerId, {
          type: "lsp:filesystem:create-directory:response",
          content: {
            requestId: message.content.requestId,
            success: true,
          },
        });
      } else if (message.type === "lsp:filesystem:delete:request") {
        if (
          !message.content.path.startsWith(consumerInstanceData.srcPath + "/")
        ) {
          return await this._languageServerProducer.send(consumerId, {
            type: "lsp:filesystem:delete:response",
            content: {
              requestId: message.content.requestId,
              success: false,
            },
          });
        }
        fs.rmSync(message.content.path, { force: true, recursive: true });
        await this._receiveMessage(
          consumerId,
          JSON.stringify({
            jsonrpc: "2.0",
            method: "textDocument/didClose",
            params: {
              textDocument: {
                uri: `file://${message.content.path}`,
              },
            },
          }),
          true
        );
        await this._languageServerProducer.send(consumerId, {
          type: "lsp:filesystem:delete:response",
          content: {
            requestId: message.content.requestId,
            success: true,
          },
        });
      } else if (message.type === "lsp:filesystem:read:request") {
        if (!fs.existsSync(message.content.path)) {
          return await this._languageServerProducer.send(consumerId, {
            type: "lsp:filesystem:read:response",
            content: {
              requestId: message.content.requestId,
              success: false,
            },
          });
        }
        const stat = fs.statSync(message.content.path);
        if (!stat.isFile()) {
          return await this._languageServerProducer.send(consumerId, {
            type: "lsp:filesystem:read:response",
            content: {
              requestId: message.content.requestId,
              success: false,
            },
          });
        }
        const content = fs.readFileSync(message.content.path, {
          encoding: "utf-8",
        });
        await this._receiveMessage(
          consumerId,
          JSON.stringify({
            jsonrpc: "2.0",
            method: "textDocument/didOpen",
            params: {
              textDocument: {
                uri: `file://${message.content.path}`,
                languageId: "cpp",
                version: 1,
                text: content,
              },
            },
          }),
          true
        );
        await this._languageServerProducer.send(consumerId, {
          type: "lsp:filesystem:read:response",
          content: {
            requestId: message.content.requestId,
            success: true,
            content,
          },
        });
      }
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

  private _startLanguageServer(consumerId: string) {
    const consumerInstanceData = this._consumers.get(consumerId);

    if (!consumerInstanceData) {
      console.error(
        `Could not find instance data for consumer with id "${consumerId}"!`
      );
      return;
    }

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
        this._addToBuffer(consumerId, data);
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
          consumerInstanceData.srcPath = `${consumerInstanceData.tmpDirPath}/src`;
          fs.mkdirSync(consumerInstanceData.srcPath);
          await this._languageServerProducer.send(consumerId, {
            type: "lsp:initialization:response",
            content: {
              sourcesPath: consumerInstanceData.srcPath,
              configuration: {
                documentSelector: [{ language: "cpp" }, { language: "c" }],
              },
            },
          });
        }
      }
    );

    consumerInstanceData.arduinoLanguageServerProcess.on("close", (code) => {
      console.log(`arduino language server process closed with code ${code}`);
    });
  }

  private _addToBuffer(consumerId: string, data: string) {
    const consumerInstanceData = this._consumers.get(consumerId);

    if (!consumerInstanceData) {
      console.error(
        `Could not find instance data for consumer with id "${consumerId}"!`
      );
      return;
    }

    consumerInstanceData.buffer = consumerInstanceData.buffer
      ? consumerInstanceData.buffer + data
      : data;
    this._checkBuffer(consumerId);
  }

  private _checkBuffer(consumerId: string) {
    const consumerInstanceData = this._consumers.get(consumerId);

    if (!consumerInstanceData) {
      console.error(
        `Could not find instance data for consumer with id "${consumerId}"!`
      );
      return;
    }

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

    this._languageServerProducer.send(consumerId, {
      type: "lsp:message",
      content: message,
    });
    consumerInstanceData.buffer = new TextDecoder().decode(
      byteArray.slice(contentLength)
    );
    this._checkBuffer(consumerId);
  }

  private async _receiveMessage(
    consumerId: string,
    message: string,
    isLocal: boolean
  ) {
    const consumerInstanceData = this._consumers.get(consumerId);

    if (!consumerInstanceData) {
      console.error(
        `Could not find instance data for consumer with id "${consumerId}"!`
      );
      return;
    }

    console.log("receiving message:", message);
    const parsedMessage = JSON.parse(message);

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

    const encodedMessage = new TextEncoder().encode(message);
    consumerInstanceData.arduinoLanguageServerProcess?.stdin?.write(
      `Content-Length: ${encodedMessage.length}\r\n\r\n`
    );
    consumerInstanceData.arduinoLanguageServerProcess?.stdin?.write(message);
  }
}
