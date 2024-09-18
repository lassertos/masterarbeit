import { DeviceHandler } from "@cross-lab-project/soa-client";
import { CompilationService__Producer } from "crosslab-compilation-service";
import { configuration } from "./configuration.mjs";
import { ProtocolMessage } from "messaging-channels";
import {
  CompilationProtocol,
  Directory,
} from "../../../libraries/compilation-protocol/dist/index.mjs";
import fs from "fs";
import path from "path";
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
    await this._deviceHandler.connect({
      endpoint: configuration.WEBSOCKET_ENDPOINT,
      id: this._instanceUrl,
      token: this._deviceToken,
    });
  }

  private _handleCompilationRequest(
    request: ProtocolMessage<CompilationProtocol, "compilation:request">
  ) {
    const directory = request.content.directory;
    const tmpDirectoryPath = fs.mkdtempSync("compilation-");
    const sourceDirectoryPath = path.join(
      tmpDirectoryPath,
      "source",
      directory.name
    );
    const buildDirectoryPath = path.join(tmpDirectoryPath, "build");

    this._recreateDirectory(directory, tmpDirectoryPath);

    try {
      const message = execSync(
        `arduino-cli compile -b arduino:avr:mega ${sourceDirectoryPath} --build-path ${buildDirectoryPath}`,
        { encoding: "utf-8", stdio: "pipe" }
      );

      const hexFilePath = path.join(
        buildDirectoryPath,
        `${directory.name}.ino.hex`
      );
      const hexData = fs.readFileSync(hexFilePath, { encoding: "utf-8" });

      this._compilationServiceProducer.send({
        type: "compilation:response",
        content: {
          success: true,
          message,
          result: hexData,
        },
      });
    } catch (error) {
      this._compilationServiceProducer.send({
        type: "compilation:response",
        content: {
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
      const entryPath = path.join(basePath, entry.name);
      if (entry.type === "directory") {
        this._recreateDirectory(entry, directoryPath);
      } else {
        fs.writeFileSync(entryPath, entry.content);
      }
    }
  }
}
