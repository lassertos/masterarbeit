import { ChildProcess, spawn } from "child_process";
import { randomUUID } from "crypto";
import WebSocket from "ws";
import { DataMessage, FileEventMessage, Message } from "./types.mts";
import fs from "fs";
import path from "path";

class ArduinoLanguageServerProvider {
  private clients: Map<
    string,
    {
      webSocket: WebSocket;
      clangdProcess: ChildProcess;
      workingDirectoryPath: string;
    }
  > = new Map();
  private webSocketServer: WebSocket.Server;
  private bufferMap: Map<string, string> = new Map();

  constructor(options: { webSocketServer: WebSocket.ServerOptions }) {
    this.webSocketServer = new WebSocket.Server(options.webSocketServer);
    this.webSocketServer.on("connection", this.registerClient.bind(this));
    console.log(
      "Arduino Language Server Provider started at port",
      this.webSocketServer.options.port
    );
  }

  private registerClient(webSocket: WebSocket) {
    const uuid = randomUUID();
    console.log(`registering client ${uuid}`);

    const workingDirectoryPath = path.join(
      "/tmp/crosslab-language-server",
      uuid
    );
    fs.mkdirSync(workingDirectoryPath, { recursive: true });
    fs.writeFileSync(
      path.join(workingDirectoryPath, "compile_commands.json"),
      JSON.stringify([
        {
          file: "main.c",
          directory: workingDirectoryPath,
          arguments: [
            "/usr/bin/avr-gcc",
            "-DMCU=atmega2560",
            "-DF_CPU=16000000",
            "-mmcu=atmega2560",
            "-o",
            "main.o",
            "main.c",
            "-iquote",
            workingDirectoryPath,
          ],
        },
      ])
    );
    webSocket.send(
      JSON.stringify({
        type: "path",
        path: workingDirectoryPath,
      })
    );

    const clangdProcess = spawn("clangd", [
      `--compile-commands-dir=${workingDirectoryPath}`,
      "-query-driver=/usr/bin/avr-gcc",
      "--background-index",
    ]);
    clangdProcess.stdout.setEncoding("utf-8");
    clangdProcess.stderr.setEncoding("utf-8");

    this.clients.set(uuid, {
      webSocket,
      clangdProcess,
      workingDirectoryPath,
    });

    clangdProcess.stdout.on("data", (data) => {
      console.log(`data ${uuid}: ${data}`);
      this.addToBuffer(uuid, data);
    });

    clangdProcess.stderr.on("data", (data) => {
      console.error(`stderr ${uuid}: ${data}`);
    });

    clangdProcess.on("close", (code) => {
      console.log(`clangd process of client ${uuid} exited with code ${code}`);
      this.unregisterClient(uuid);
    });

    webSocket.on("close", (code, reason) => {
      console.log(
        `webSocket connection of client ${uuid} closed with code ${code} and reason "${reason.toString()}"`
      );
      this.unregisterClient(uuid);
    });

    webSocket.on("message", (data) => {
      console.log(`incoming ${uuid}: ${data.toString()}`);
      const message = JSON.parse(data.toString()) as Message;
      if (message.type === "data") return this.receiveMessage(uuid, message);
      if (message.type === "file-event") return this.handleFileEvent(message);
    });
  }

  private addToBuffer(uuid: string, data: string) {
    const buffer = this.bufferMap.get(uuid);
    this.bufferMap.set(uuid, buffer ? buffer + data : data);
    this.checkBuffer(uuid);
  }

  private checkBuffer(uuid: string) {
    const buffer = this.bufferMap.get(uuid);
    if (!buffer) return;
    if (buffer.length === 0) return;

    const contentBeginIndex = buffer.indexOf("\r\n\r\n") + 4;
    const contentLengthString = buffer.slice(
      buffer.indexOf(":") + 1,
      buffer.indexOf("\r\n")
    );
    const contentString = buffer.slice(contentBeginIndex);
    const byteArray = new TextEncoder().encode(contentString);
    const contentLength = parseInt(contentLengthString);
    const bytes = byteArray.slice(0, contentLength);

    if (bytes.length < contentLength) return;

    this.sendMessage(
      uuid,
      JSON.stringify({ type: "data", data: new TextDecoder().decode(bytes) })
    );
    this.bufferMap.set(
      uuid,
      new TextDecoder().decode(byteArray.slice(contentLength))
    );
    this.checkBuffer(uuid);
  }

  private unregisterClient(uuid: string) {
    console.log(`unregistering client ${uuid}`);
    const client = this.clients.get(uuid);
    client?.webSocket.terminate();
    client?.clangdProcess.kill();
    this.clients.delete(uuid);
  }

  private sendMessage(uuid: string, message: string) {
    // console.log(`outgoing ${uuid}: ${message}`);
    const client = this.clients.get(uuid);
    client?.webSocket.send(message);
  }

  private receiveMessage(uuid: string, message: DataMessage) {
    const client = this.clients.get(uuid);
    const encodedMessage = new TextEncoder().encode(message.data);
    client?.clangdProcess.stdin?.write(
      `Content-Length: ${encodedMessage.length}\r\n\r\n`
    );
    client?.clangdProcess.stdin?.write(message.data);
  }

  private handleFileEvent(fileEvent: FileEventMessage) {
    switch (fileEvent.event) {
      case "create": {
        const parentDirectoryPath = path.dirname(fileEvent.path);
        if (!fs.existsSync(parentDirectoryPath)) {
          fs.mkdirSync(parentDirectoryPath, { recursive: true });
        }
        fs.writeFileSync(fileEvent.path, "");
        break;
      }
      case "delete": {
        if (fs.existsSync(fileEvent.path)) fs.rmSync(fileEvent.path);
        break;
      }
      case "change": {
        const parentDirectoryPath = path.dirname(fileEvent.path);
        if (!fs.existsSync(parentDirectoryPath)) {
          fs.mkdirSync(parentDirectoryPath, { recursive: true });
        }
        fs.writeFileSync(fileEvent.path, fileEvent.content);
        break;
      }
    }
  }
}

new ArduinoLanguageServerProvider({ webSocketServer: { port: 3010 } });
