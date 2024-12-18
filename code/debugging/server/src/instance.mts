import { CompilationService__Consumer } from "@crosslab-ide/crosslab-compilation-service";
import {
  DebuggingAdapterServiceProducer,
  isDebugAdapterProtocolType,
} from "@crosslab-ide/crosslab-debugging-adapter-service";
import { DebuggingTargetServiceConsumer } from "@crosslab-ide/crosslab-debugging-target-service";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import { resultFormats, Session } from "./types.mjs";
import { Directory } from "@crosslab-ide/crosslab-debugging-adapter-service";
import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import net from "net";
import { MessagingServiceProsumer } from "@crosslab-ide/messaging-service";
import { randomUUID } from "crypto";
import { DebugAdapterProtocolHandler } from "./debugAdapterProtocolHandler.mjs";

export class GdbDebuggingInstance {
  private _deviceHandler: DeviceHandler;
  private _debuggingAdapterServiceProducer: DebuggingAdapterServiceProducer;
  private _debuggingTargetServiceConsumer: DebuggingTargetServiceConsumer;
  private _compilationServiceConsumer: CompilationService__Consumer<
    typeof resultFormats
  >;
  private _messagingService: MessagingServiceProsumer;
  private _instanceUrl: string;
  private _deviceToken: string;
  private _sessions: Map<string, Session> = new Map();
  // private _messageBuffers: Map<string, DebugAdapterProtocol.ProtocolMessage[]> =
  //   new Map();

  constructor(instanceUrl: string, deviceToken: string) {
    this._instanceUrl = instanceUrl;
    this._deviceToken = deviceToken;

    this._deviceHandler = new DeviceHandler();
    this._debuggingAdapterServiceProducer = new DebuggingAdapterServiceProducer(
      "debugging-adapter"
    );
    this._debuggingTargetServiceConsumer = new DebuggingTargetServiceConsumer(
      "debugging-target"
    );
    this._compilationServiceConsumer = new CompilationService__Consumer(
      "compilation",
      resultFormats
    );
    this._messagingService = new MessagingServiceProsumer(
      "messaging",
      undefined,
      undefined
    );

    this._debuggingAdapterServiceProducer.on(
      "dap-message",
      async (sessionId, message) => {
        const session = this._sessions.get(sessionId);
        // const messageBuffer = this._messageBuffers.get(sessionId);

        if (!session) {
          console.error(`Could not find session with id "${sessionId}"`);
          // if (messageBuffer) {
          //   messageBuffer?.push(message);
          // } else {
          //   console.error(
          //     `Could not find message buffer with id "${sessionId}"`
          //   );
          // }
          return;
        }

        session.debugAdapterProtocolHandler.handleIncomingMessage(
          sessionId,
          message
        );
      }
    );

    const producerId = new Promise<string>((resolve) => {
      this._compilationServiceConsumer.once("new-producer", (producerId) =>
        resolve(producerId)
      );
    });

    this._debuggingAdapterServiceProducer.on(
      "new-session",
      async (consumerId, requestId, sessionInfo) => {
        const sessionId = randomUUID();

        // this._messageBuffers.set(sessionId, []);
        const compilationResult =
          await this._compilationServiceConsumer.compile(
            await producerId,
            sessionInfo.directory
          );

        if (!compilationResult.success) {
          console.error(
            `Something went wrong during the compilation: ${compilationResult.message}`
          );
          return;
        }

        if (compilationResult.result.type !== "file") {
          throw new Error(
            "Expected the result of the compilation to be a file!"
          );
        }

        const compiledProgram = compilationResult.result.content;

        // create temporary directory for the debug session
        const tmpDirPath = await fs.mkdtemp("/tmp/debug-session-");
        const srcDirPath = path.join(tmpDirPath, "sources");
        const elfDirPath = path.join(tmpDirPath, "elf");
        const unixSocketPath = path.join(tmpDirPath, "debugging-session.sock");
        await fs.mkdir(srcDirPath);
        await fs.mkdir(elfDirPath);

        // recreate directory
        await this._recreateDirectory(sessionInfo.directory, srcDirPath);

        // save compilation result
        const elfFilePath = path.join(
          elfDirPath,
          compilationResult.result.name
        );
        await fs.writeFile(elfFilePath, compiledProgram);

        const server = net.createServer((socket) => {
          socket.on("error", (error) => {
            console.error(error);
          });
          this._messagingService.on("message", (message) => {
            if (
              message.content instanceof Uint8Array &&
              (socket.readyState === "open" ||
                socket.readyState === "writeOnly")
            ) {
              socket.write(message.content, (error) => {
                console.error(error);
              });
            }
          });
          socket.on("data", async (data) => {
            console.log("Socket received data:", data);
            await this._messagingService.send({
              type: "debugging:message",
              content: data,
            });
          });
        });

        await new Promise<void>((resolve) =>
          server.listen(unixSocketPath, resolve)
        );

        const gdbProcess = this._startGdb(sessionId, srcDirPath, elfFilePath);

        const configuration = {
          sessionId,
          target: unixSocketPath,
          program: elfFilePath,
        };

        const debugAdapterProtocolHandler = new DebugAdapterProtocolHandler(
          sessionId,
          consumerId
        );

        debugAdapterProtocolHandler.on("incoming-message", async (message) => {
          const session = this._sessions.get(sessionId);

          if (!session) {
            console.error(`Could not find session with id "${sessionId}"!`);
            return;
          }

          const updatedMessage = JSON.parse(
            JSON.stringify(message)
              .replaceAll("crosslabfs:/workspace", session.paths.projectDir)
              .replaceAll("crosslab-remote:", "")
          );

          const stringifiedMessage = JSON.stringify(updatedMessage);
          const encodedMessage = new TextEncoder().encode(stringifiedMessage);

          await new Promise<void>((resolve) => {
            if (
              !session.gdbProcess.stdin.write(
                `Content-Length: ${encodedMessage.length}\r\n\r\n${stringifiedMessage}`
              )
            ) {
              session.gdbProcess.stdin.once("drain", resolve);
            } else {
              process.nextTick(resolve);
            }
          });
        });

        debugAdapterProtocolHandler.on(
          "outgoing-message",
          async (sessionId, consumerId, message) => {
            await this._debuggingAdapterServiceProducer.send(consumerId, {
              type: "message:dap",
              content: {
                sessionId,
                message,
              },
            });
          }
        );

        this._sessions.set(sessionId, {
          paths: {
            tmpDir: tmpDirPath,
            srcDir: srcDirPath,
            projectDir: path.join(srcDirPath, sessionInfo.directory.name),
            elfDir: elfDirPath,
            elfFile: elfFilePath,
          },
          gdbProcess,
          buffer: "",
          configuration,
          debugAdapterProtocolHandler,
        });

        debugAdapterProtocolHandler.on("restart", async (message) => {
          const session = this._sessions.get(sessionId);
          if (!session) {
            console.error(`Could not find session with id "${sessionId}"!`);
            return;
          }
          session.buffer = "";
          session.gdbProcess = this._startGdb(
            sessionId,
            srcDirPath,
            elfFilePath
          );
          await this._debuggingTargetServiceConsumer.endDebugging();
          await this._debuggingTargetServiceConsumer.startDebugging(
            compiledProgram
          );
          await this._debuggingAdapterServiceProducer.send(consumerId, {
            type: "message:dap",
            content: {
              sessionId,
              message,
            },
          });
        });

        await this._debuggingTargetServiceConsumer.startDebugging(
          compiledProgram
        );

        // for (const message of this._messageBuffers.get(sessionId) ?? []) {
        //   debugAdapterProtocolHandler.handleIncomingMessage(sessionId, message);
        // }

        // this._messageBuffers.delete(sessionId);

        await this._debuggingAdapterServiceProducer.send(consumerId, {
          type: "session:start:response",
          content: {
            requestId,
            success: true,
            message: "GDB debugging session started successfully!",
            sessionId,
            configuration,
          },
        });
      }
    );

    this._debuggingAdapterServiceProducer.on(
      "join-session",
      async (consumerId, requestId, sessionId) => {
        const session = this._sessions.get(sessionId);

        if (!session) {
          return await this._debuggingAdapterServiceProducer.send(consumerId, {
            type: "session:join:response",
            content: {
              requestId,
              success: false,
              message: `Could not find session with id "${sessionId}"!`,
            },
          });
        }

        const subSessionId = randomUUID();
        session.debugAdapterProtocolHandler.addSubSession(
          subSessionId,
          consumerId
        );

        this._sessions.set(subSessionId, session);

        return await this._debuggingAdapterServiceProducer.send(consumerId, {
          type: "session:join:response",
          content: {
            requestId,
            success: true,
            sessionId: subSessionId,
          },
        });
      }
    );

    this._deviceHandler.addService(this._debuggingAdapterServiceProducer);
    this._deviceHandler.addService(this._compilationServiceConsumer);
    this._deviceHandler.addService(this._messagingService);
    this._deviceHandler.addService(this._debuggingTargetServiceConsumer);
  }

  public async connect() {
    const response = await fetch(this._instanceUrl + "/websocket", {
      method: "POST",
      headers: [["authorization", `Bearer ${this._deviceToken}`]],
    });
    const token = await response.json();
    const deviceId = this._instanceUrl.split("/").at(-1)!;
    const webSocketEndpoint = this._instanceUrl.replace(deviceId, "websocket");
    await this._deviceHandler.connect({
      endpoint: webSocketEndpoint,
      id: this._instanceUrl,
      token,
    });
  }

  private _startGdb(
    sessionId: string,
    srcDirPath: string,
    elfFilePath: string
  ) {
    // start gdb session with new src directory and dap interface
    const gdbProcess = spawn("avr-gdb", ["--interpreter=dap", elfFilePath], {
      cwd: srcDirPath,
    });

    gdbProcess.on("exit", (code) => {
      console.log(`gdb process exited with code ${code}`);
      this._debuggingTargetServiceConsumer.endDebugging();
      if (code !== 0) {
        // TODO: handle crashed server
      }
    });
    gdbProcess.stdout.setEncoding("utf-8");
    gdbProcess.stderr.setEncoding("utf-8");

    gdbProcess.stdout.on("data", async (data) => {
      console.log(`stdout: ${data}`);
      this._addToBuffer(sessionId, data);
    });

    gdbProcess.stderr.on("data", (data) => {
      console.log(`stderr: ${data}`);
    });

    return gdbProcess;
  }

  private async _recreateDirectory(directory: Directory, currentPath: string) {
    const directoryPath = path.join(currentPath, directory.name);
    await fs.mkdir(directoryPath);

    for (const entryName in directory.content) {
      const entry = directory.content[entryName];
      const entryPath = path.join(directoryPath, entryName);

      if (entry.type === "file") {
        await fs.writeFile(entryPath, entry.content);
      } else {
        await this._recreateDirectory(
          { ...entry, name: entryName },
          directoryPath
        );
      }
    }
  }

  private _addToBuffer(sessionId: string, data: string) {
    const session = this._sessions.get(sessionId);

    if (!session) {
      console.error(`Could not find session with id "${sessionId}"!`);
      return;
    }

    session.buffer = session.buffer + data;
    this._checkBuffer(sessionId);
  }

  private _checkBuffer(sessionId: string) {
    const session = this._sessions.get(sessionId);

    if (!session) {
      console.error(`Could not find session with id "${sessionId}"!`);
      return;
    }

    if (session.buffer.length === 0) return;

    const contentBeginIndex = session.buffer.indexOf("\r\n\r\n") + 4;
    const contentLengthString = session.buffer.slice(
      session.buffer.indexOf(":") + 1,
      session.buffer.indexOf("\r\n")
    );
    const contentString = session.buffer.slice(contentBeginIndex);
    const byteArray = new TextEncoder().encode(contentString);
    const contentLength = parseInt(contentLengthString);
    const bytes = byteArray.slice(0, contentLength);

    if (bytes.length < contentLength) return;

    try {
      const message = JSON.parse(
        new TextDecoder()
          .decode(bytes)
          .replaceAll(session.paths.projectDir, "crosslabfs:/workspace")
      );

      if (!isDebugAdapterProtocolType("ProtocolMessage", message)) {
        throw new Error(
          `Outgoing message is not a valid debug adapter protocol message!`
        );
      }

      session.debugAdapterProtocolHandler.handleOutgoingMessage(message);
    } catch (error) {
      console.error(error);
    }

    session.buffer = new TextDecoder().decode(byteArray.slice(contentLength));
    this._checkBuffer(sessionId);
  }
}
