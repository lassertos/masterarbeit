import {
  ChildProcessWithoutNullStreams,
  exec,
  execSync,
  spawn,
} from "child_process";
import { WebSocket } from "ws";
import fs from "fs";
import path from "path";
import { TypedEmitter } from "tiny-typed-emitter";
import Queue from "queue";

type LSPEvents = {
  "rebuild:begin": () => void;
  "rebuild:end": () => void;
};

type DataMessage = {
  type: "data";
  data: string;
};

export class ArduinoCliLanguageServerInstance {
  private _webSocket: WebSocket;
  private _buffer: string = "";
  private _arduinoLanguageServerProcess?: ChildProcessWithoutNullStreams;
  private _srcPath?: string;
  private _rootPath?: string;
  private _tmpDirPath?: string;
  private _buildPath?: string;
  private _buildSketchRootPath?: string;
  private _fullBuildPath?: string;
  private _tmpPath: string;
  private _emitter = new TypedEmitter<LSPEvents>();
  private _promises: Record<keyof LSPEvents, (() => void)[]> = {
    "rebuild:begin": [],
    "rebuild:end": [],
  };
  private _queue: Queue = new Queue({
    concurrency: 1,
    autostart: true,
  });

  constructor(webSocket: WebSocket) {
    this._webSocket = webSocket;
    this._tmpPath = fs.mkdtempSync("/tmp/arduino");
    for (const event of this._emitter.eventNames()) {
      this._emitter.on(event, () => {
        for (const resolve of this._promises[event]) {
          resolve();
        }
        this._promises[event] = [];
      });
    }
    this._startLanguageServer();
  }

  private _startLanguageServer() {
    this._arduinoLanguageServerProcess = spawn("arduino-language-server", [
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
      `${this._tmpPath}`,
    ]);
    this._arduinoLanguageServerProcess.on("exit", (code) => {
      if (code !== 0) {
        // TODO: handle crashed server
      }
    });
    this._arduinoLanguageServerProcess.stdout.setEncoding("utf-8");
    this._arduinoLanguageServerProcess.stderr.setEncoding("utf-8");

    this._arduinoLanguageServerProcess.stdout.on("data", (data) => {
      console.log(`data: ${data}`);
      this._addToBuffer(data);
    });

    this._arduinoLanguageServerProcess.stderr.on("data", (data) => {
      console.error(`stderr: ${data}`);
      const hadTmpDir = !!this._tmpDirPath;
      this._tmpDirPath ??= data
        .match(/Language server temp directory: ([0-9a-zA-Z/-]*)/)
        ?.at(1);
      this._buildPath ??= data
        .match(/Language server build path: ([0-9a-zA-Z/-]*)/)
        ?.at(1);
      this._buildSketchRootPath ??= data
        .match(/Language server build sketch root: ([0-9a-zA-Z/-]*)/)
        ?.at(1);
      this._fullBuildPath ??= data
        .match(/Language server FULL build path: ([0-9a-zA-Z/-]*)/)
        ?.at(1);

      if (this._tmpDirPath && !hadTmpDir) {
        this._srcPath = `${this._tmpDirPath}/src`;
        fs.mkdirSync(this._srcPath);
        this._webSocket.send(
          JSON.stringify({ type: "path", data: this._srcPath })
        );
      }
    });

    this._arduinoLanguageServerProcess.on("close", (code) => {
      console.log(`arduino language server process exited with code ${code}`);
    });

    this._webSocket.on("message", async (data) => {
      console.log(`incoming: ${data.toString()}`);
      const message = JSON.parse(data.toString());
      if (message.type === "data") {
        const parsedMessage = JSON.parse(message.data);
        if (parsedMessage.method === "initialize") {
          this._rootPath = parsedMessage.params.rootUri.replace(
            "file://",
            ""
          ) as string;
          const sketchPath = path.join(
            this._rootPath,
            `${path.basename(this._rootPath)}.ino`
          );
          if (!fs.existsSync(sketchPath)) {
            fs.writeFileSync(sketchPath, "");
          }
        }
        return this._queue.push(async () => {
          await this._receiveMessage(message);
        });
      }
      if (message.type === "filesystem:create") {
        if (!message.data.path.startsWith(this._srcPath + "/")) return;
        if (message.data.type === "directory") {
          fs.mkdirSync(message.data.path);
        } else if (message.data.type === "file") {
          fs.writeFileSync(message.data.path, message.data.content);
        }
      }
      if (message.type === "filesystem:delete") {
        if (!message.data.path.startsWith(this._srcPath + "/")) return;
        fs.rmSync(message.data.path, { force: true });
      }
    });
  }

  private _addToBuffer(data: string) {
    this._buffer = this._buffer ? this._buffer + data : data;
    this._checkBuffer();
  }

  private _checkBuffer() {
    if (!this._buffer) return;
    if (this._buffer.length === 0) return;

    const contentBeginIndex = this._buffer.indexOf("\r\n\r\n") + 4;
    const contentLengthString = this._buffer.slice(
      this._buffer.indexOf(":") + 1,
      this._buffer.indexOf("\r\n")
    );
    const contentString = this._buffer.slice(contentBeginIndex);
    const byteArray = new TextEncoder().encode(contentString);
    const contentLength = parseInt(contentLengthString);
    const bytes = byteArray.slice(0, contentLength);

    if (bytes.length < contentLength) return;

    const message = new TextDecoder().decode(bytes);

    this._webSocket.send(
      JSON.stringify({
        type: "data",
        data: message,
      })
    );
    this._buffer = new TextDecoder().decode(byteArray.slice(contentLength));
    this._checkBuffer();
  }

  private async _receiveMessage(message: DataMessage) {
    console.log("receiving message:", message);
    const parsedMessage = JSON.parse(message.data);

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

    const encodedMessage = new TextEncoder().encode(message.data);
    this._arduinoLanguageServerProcess?.stdin?.write(
      `Content-Length: ${encodedMessage.length}\r\n\r\n`
    );
    this._arduinoLanguageServerProcess?.stdin?.write(message.data);

    if (parsedMessage.method === "textDocument/didOpen") {
      await this._receiveMessage({
        type: "data",
        data: JSON.stringify({
          jsonrpc: "2.0",
          method: "textDocument/didSave",
          params: {
            textDocument: {
              uri: parsedMessage.params.textDocument.uri,
            },
            text: parsedMessage.params.textDocument.text,
          },
        }),
      });
    }
  }
}
