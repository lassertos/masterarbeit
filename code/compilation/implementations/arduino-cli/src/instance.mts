import { DeviceHandler } from "@crosslab-ide/soa-client";
import { CompilationService__Producer } from "@crosslab-ide/crosslab-compilation-service";
import { configuration } from "./configuration.mjs";
import { ProtocolMessage } from "@crosslab-ide/abstract-messaging-channel";
import { CompilationProtocol } from "@crosslab-ide/crosslab-compilation-service";
import fs from "fs";
import path from "path";
import os from "os";
import { execSync } from "child_process";
import { arduinoCliResultFormats, ArduinoCliResultFormats } from "./types.mjs";
import { Directory } from "@crosslab-ide/filesystem-schemas";

export class ArduinoCliCompilationInstance {
  private _deviceHandler: DeviceHandler;
  private _compilationServiceProducer: CompilationService__Producer<ArduinoCliResultFormats>;
  private _instanceUrl: string;
  private _deviceToken: string;

  constructor(instanceUrl: string, deviceToken: string) {
    this._instanceUrl = instanceUrl;
    this._deviceToken = deviceToken;

    this._deviceHandler = new DeviceHandler();

    this._compilationServiceProducer = new CompilationService__Producer(
      "compilation",
      arduinoCliResultFormats
    );

    this._compilationServiceProducer.on(
      "compilation:request",
      (clientId, request) => this._handleCompilationRequest(clientId, request)
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
    await this._deviceHandler.connect({
      endpoint: configuration.WEBSOCKET_ENDPOINT,
      id: this._instanceUrl,
      token: token,
    });
  }

  private _handleCompilationRequest(
    clientId: string,
    request: ProtocolMessage<
      CompilationProtocol<ArduinoCliResultFormats>,
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
      // NOTE: the last build-property "compiler.cpp.flags" removed the -Os flag since it causes
      // problems when debugging since it removes source files from the debugging information
      const message = execSync(
        `arduino-cli compile -b arduino:avr:mega ${projectDirectoryPath} --build-path ${buildDirectoryPath} --build-property "build.extra_flags=-fdebug-prefix-map=${path.dirname(
          projectDirectoryPath
        )}=." --build-property "compiler.c.elf.extra_flags=-fdebug-prefix-map=${path.dirname(
          projectDirectoryPath
        )}=." --build-property "compiler.cpp.flags=-c -g {compiler.warning_flags} -std=gnu++11 -fpermissive -fno-exceptions -ffunction-sections -fdata-sections -fno-threadsafe-statics -Wno-error=narrowing -MMD -flto"`,
        { encoding: "utf-8", stdio: "pipe", cwd: sourceDirectoryPath }
      );

      const files = {
        "sketch.ino.elf": fs.readFileSync(
          path.join(buildDirectoryPath, `${directory.name}.ino.elf`)
        ) as Uint8Array<ArrayBuffer>,
        "sketch.ino.hex": fs.readFileSync(
          path.join(buildDirectoryPath, `${directory.name}.ino.hex`)
        ) as Uint8Array<ArrayBuffer>,
        "sketch.ino.with_bootloader.bin": fs.readFileSync(
          path.join(
            buildDirectoryPath,
            `${directory.name}.ino.with_bootloader.bin`
          )
        ) as Uint8Array<ArrayBuffer>,
        "sketch.ino.with_bootloader.hex": fs.readFileSync(
          path.join(
            buildDirectoryPath,
            `${directory.name}.ino.with_bootloader.hex`
          )
        ) as Uint8Array<ArrayBuffer>,
      };

      switch (request.format) {
        case "build directory":
          this._compilationServiceProducer.send(clientId, {
            type: "compilation:response",
            content: {
              requestId: request.requestId,
              success: true,
              message,
              format: "build directory",
              result: {
                type: "directory",
                name: "build",
                content: {
                  "sketch.ino.elf": {
                    type: "file",
                    content: files["sketch.ino.elf"],
                  },
                  "sketch.ino.hex": {
                    type: "file",
                    content: files["sketch.ino.hex"],
                  },
                  "sketch.ino.with_bootloader.bin": {
                    type: "file",
                    content: files["sketch.ino.with_bootloader.bin"],
                  },
                  "sketch.ino.bootloader.hex": {
                    type: "file",
                    content: files["sketch.ino.with_bootloader.hex"],
                  },
                },
              },
            },
          });
          break;
        case "elf":
          this._compilationServiceProducer.send(clientId, {
            type: "compilation:response",
            content: {
              requestId: request.requestId,
              success: true,
              message,
              format: "elf",
              result: {
                type: "file",
                name: "sketch.ino.elf",
                content: files["sketch.ino.elf"],
              },
            },
          });
          break;
        case "hex":
          this._compilationServiceProducer.send(clientId, {
            type: "compilation:response",
            content: {
              requestId: request.requestId,
              success: true,
              message,
              format: "hex",
              result: {
                type: "file",
                name: "sketch.ino.hex",
                content: files["sketch.ino.hex"],
              },
            },
          });
          break;
        case "bin with bootloader":
          this._compilationServiceProducer.send(clientId, {
            type: "compilation:response",
            content: {
              requestId: request.requestId,
              success: true,
              message,
              format: "bin with bootloader",
              result: {
                type: "file",
                name: "sketch.ino.with_bootloader.bin",
                content: files["sketch.ino.with_bootloader.bin"],
              },
            },
          });
          break;
        case "hex with bootloader":
          this._compilationServiceProducer.send(clientId, {
            type: "compilation:response",
            content: {
              requestId: request.requestId,
              success: true,
              message,
              format: "hex with bootloader",
              result: {
                type: "file",
                name: "sketch.ino.with_bootloader.hex",
                content: files["sketch.ino.with_bootloader.hex"],
              },
            },
          });
          break;
        default:
          this._compilationServiceProducer.send(clientId, {
            type: "compilation:response",
            content: {
              requestId: request.requestId,
              success: true,
              message,
              format: "elf",
              result: {
                type: "file",
                name: "sketch.ino.elf",
                content: files["sketch.ino.elf"],
              },
            },
          });
          break;
      }
    } catch (error) {
      this._compilationServiceProducer.send(clientId, {
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
    for (const name in directory.content) {
      const entryPath = path.join(directoryPath, name);
      const entry = directory.content[name];
      if (entry.type === "directory") {
        this._recreateDirectory({ ...entry, name }, directoryPath);
      } else {
        fs.writeFileSync(entryPath, entry.content);
      }
    }
  }
}
