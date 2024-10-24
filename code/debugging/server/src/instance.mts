import { CompilationService__Consumer } from "@crosslab-ide/crosslab-compilation-service";
import { DebuggingServiceProducer } from "@crosslab-ide/crosslab-debugging-service";
import { DeviceHandler } from "@crosslab-ide/soa-client";

export class GdbDebuggingInstance {
  private _deviceHandler: DeviceHandler;
  private _debuggingServiceProducer: DebuggingServiceProducer;
  private _compilationServiceConsumer: CompilationService__Consumer;
  private _instanceUrl: string;
  private _deviceToken: string;

  constructor(instanceUrl: string, deviceToken: string) {
    this._instanceUrl = instanceUrl;
    this._deviceToken = deviceToken;

    this._deviceHandler = new DeviceHandler();

    this._debuggingServiceProducer = new DebuggingServiceProducer("debugging");
    this._compilationServiceConsumer = new CompilationService__Consumer(
      "compilation"
    );

    // TODO: handle incoming messages for the debugging service producer
    this._debuggingServiceProducer.on("new-session", async (sessionInfo) => {
      const compilationResult = await this._compilationServiceConsumer.compile(
        sessionInfo.directory
      );

      if (!compilationResult.success) {
        console.error(
          `Something went wrong during the compilation: ${compilationResult.message}`
        );
        return;
      }
    });

    this._deviceHandler.addService(this._debuggingServiceProducer);
    this._deviceHandler.addService(this._compilationServiceConsumer);
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
}
