import { DeviceHandler } from "@cross-lab-project/soa-client";
import { CompilationService__Producer } from "crosslab-compilation-service";
import { configuration } from "./configuration.mjs";

export class ArduinoCliCompilationInstance {
  private _deviceHandler: DeviceHandler;
  private _instanceUrl: string;
  private _deviceToken: string;

  constructor(instanceUrl: string, deviceToken: string) {
    this._instanceUrl = instanceUrl;
    this._deviceToken = deviceToken;
    this._deviceHandler = new DeviceHandler();

    const compilationServiceProducer = new CompilationService__Producer(
      "compilation"
    );

    this._deviceHandler.addService(compilationServiceProducer);
  }

  public async connect() {
    await this._deviceHandler.connect({
      endpoint: configuration.WEBSOCKET_ENDPOINT,
      id: this._instanceUrl,
      token: this._deviceToken,
    });
  }
}
