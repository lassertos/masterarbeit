import { DeviceHandler } from "@crosslab-ide/soa-client";
import { CompilationService__Producer } from "@crosslab-ide/crosslab-compilation-service";
import { configuration } from "./configuration.mjs";
import { ProtocolMessage } from "@crosslab-ide/abstract-messaging-channel";
import {
  CompilationProtocol,
  Directory,
} from "@crosslab-ide/compilation-messaging-protocol";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";

export class ArduinoCliCompilationInstance {
  private _deviceHandler: DeviceHandler;
  private _compilationServiceProducer: CompilationService__Producer;
  private _instanceUrl: string;
  private _deviceToken: string;

  constructor(instanceUrl: string, deviceToken: string) {
    this._instanceUrl = instanceUrl;
    this._deviceToken = deviceToken;

    this._deviceHandler = new DeviceHandler();

    this._compilationServiceProducer = new CompilationService__Producer(
      "compilation"
    );

    this._compilationServiceProducer.on("compilation:request", (request) =>
      this._handleCompilationRequest(request)
    );

    this._deviceHandler.addService(this._compilationServiceProducer);
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
    console.log("endpoint:", configuration.WEBSOCKET_ENDPOINT);
    console.log("id:", this._instanceUrl);
    console.log("token:", token);
    await this._deviceHandler.connect({
      endpoint: configuration.WEBSOCKET_ENDPOINT,
      id: this._instanceUrl,
      token: token,
    });
  }

  private _handleCompilationRequest(
    request: ProtocolMessage<
      CompilationProtocol,
      "compilation:request"
    >["content"]
  ) {
    console.log(
      "handling compilation request!",
      JSON.stringify(request, null, 4)
    );
    const directory = request.directory;
    const tmpDirectoryPath = fs.mkdtempSync(
      path.join(os.tmpdir(), "compilation-")
    );
    const sourceDirectoryPath = path.join(tmpDirectoryPath, "source");
    const projectDirectoryPath = path.join(sourceDirectoryPath, directory.name);
    const buildDirectoryPath = path.join(tmpDirectoryPath, "build");

    fs.mkdirSync(sourceDirectoryPath);
    fs.mkdirSync(buildDirectoryPath);

    this._recreateDirectory(directory, sourceDirectoryPath);

    try {
      const message = execSync(
        `arduino-cli compile -b arduino:avr:mega ${projectDirectoryPath} --build-path ${buildDirectoryPath}`,
        { encoding: "utf-8", stdio: "pipe" }
      );

      const elfFilePath = path.join(
        buildDirectoryPath,
        `${directory.name}.ino.elf`
      );
      const elfData = fs.readFileSync(elfFilePath);

      this._compilationServiceProducer.send({
        type: "compilation:response",
        content: {
          requestId: request.requestId,
          success: true,
          message,
          result: elfData,
        },
      });
    } catch (error) {
      this._compilationServiceProducer.send({
        type: "compilation:response",
        content: {
          requestId: request.requestId,
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Something went wrong during the compilation!",
        },
      });
    }
  }

  private _recreateDirectory(directory: Directory, basePath: string) {
    const directoryPath = path.join(basePath, directory.name);
    fs.mkdirSync(directoryPath);
    for (const entry of directory.content) {
      const entryPath = path.join(directoryPath, entry.name);
      if (entry.type === "directory") {
        this._recreateDirectory(entry, directoryPath);
      } else {
        fs.writeFileSync(entryPath, entry.content);
      }
    }
  }
}
