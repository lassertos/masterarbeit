import { LitElement, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { DeviceHandler } from "@crosslab-ide/soa-client";
import {
  ElectricalConnectionService,
  GPIO,
} from "@crosslab-ide/soa-service-electrical";
export * from "./connect-panel.mjs";
export * from "./device-panel.mjs";

function isHigh(signalState: string | undefined) {
  return signalState === "strongH" || signalState === "weakH";
}

@customElement("ecs-application")
export class EcsApplication extends LitElement {
  @state()
  private _isConnected: boolean = false;

  @state()
  private _isInitialized: boolean = false;

  private deviceHandler: DeviceHandler;

  private motors: {
    xLeft: boolean;
    xRight: boolean;
    yTop: boolean;
    yBottom: boolean;
  } = { xLeft: false, xRight: false, yTop: false, yBottom: false };

  private interfaces: Record<string, GPIO.GPIOInterface> = {};

  constructor() {
    super();

    this.deviceHandler = new DeviceHandler();
    this.initialize();
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }

  render() {
    return html`<div
      class="bg-slate-200 w-full h-full flex items-center justify-center"
    >
      <div class="${this._isInitialized ? "hidden" : "lds-ring"} w-full h-full">
        <div></div>
        <div></div>
        <div></div>
        <div></div>
      </div>
      <ecs-connect-panel
        ?hidden=${this._isConnected || !this._isInitialized}
        @connection-data=${this.onConnectionData}
      ></ecs-connect-panel>
      <ecs-device-panel
        .xMotorLeft=${this.motors.xLeft}
        .xMotorRight=${this.motors.xRight}
        .yMotorBottom=${this.motors.yBottom}
        .yMotorTop=${this.motors.yTop}
        @position-updated=${this.onPositionUpdated}
        ?hidden=${!this._isConnected || !this._isInitialized}
        class="w-full h-full"
      ></ecs-device-panel>
    </div>`;
  }

  private initialize() {
    const sensorService = new ElectricalConnectionService("sensors", [
      "LimitXLeft",
      "LimitXRight",
      "LimitYTop",
      "LimitYBottom",
    ]);
    const actuatorService = new ElectricalConnectionService("actuators", [
      "XMotorLeft",
      "XMotorRight",
      "YMotorTop",
      "YMotorBottom",
    ]);

    const sensorInterface = new GPIO.ConstructableGPIOInterface([
      "LimitXLeft",
      "LimitXRight",
      "LimitYTop",
      "LimitYBottom",
    ]);
    const actuatorInterface = new GPIO.ConstructableGPIOInterface([
      "XMotorLeft",
      "XMotorRight",
      "YMotorTop",
      "YMotorBottom",
    ]);

    sensorService.addInterface(sensorInterface);
    sensorService.on("newInterface", (newInterface) => {
      console.log("new sensor interface", newInterface.connectionInterface);

      const gpioInterface =
        newInterface.connectionInterface as GPIO.GPIOInterface;

      const name = gpioInterface.configuration.signals.gpio;

      this.interfaces[name] = gpioInterface;
    });

    actuatorService.addInterface(actuatorInterface);
    actuatorService.on("newInterface", (newInterface) => {
      console.log("new actuator interface", newInterface.connectionInterface);

      const gpioInterface =
        newInterface.connectionInterface as GPIO.GPIOInterface;

      const name = gpioInterface.configuration.signals.gpio;

      this.interfaces[name] = gpioInterface;

      gpioInterface.on("signalChange", () => {
        this.motors.xLeft = isHigh(this.interfaces["XMotorLeft"].signalState);
        this.motors.xRight = isHigh(this.interfaces["XMotorRight"].signalState);
        this.motors.yTop = isHigh(this.interfaces["YMotorTop"].signalState);
        this.motors.yBottom = isHigh(
          this.interfaces["YMotorBottom"].signalState
        );

        this.requestUpdate();
      });
    });

    this.deviceHandler.addService(sensorService);
    this.deviceHandler.addService(actuatorService);

    this._isInitialized = true;
    this.requestUpdate();
  }

  private async onConnectionData(
    event: CustomEvent<{
      deviceUrl: string;
      websocketUrl: string;
      websocketToken: string;
    }>
  ) {
    console.log("received connection data", event.detail);
    await this.deviceHandler.connect({
      endpoint: event.detail.websocketUrl,
      id: event.detail.deviceUrl,
      token: event.detail.websocketToken,
    });

    this._isConnected = true;
    this.requestUpdate();
  }

  private onPositionUpdated(
    event: CustomEvent<{
      x: number;
      y: number;
      limitXLeft: boolean;
      limitXRight: boolean;
      limitYBottom: boolean;
      limitYTop: boolean;
    }>
  ) {
    if (this.interfaces["LimitXLeft"]) {
      if (
        event.detail.limitXLeft &&
        this.interfaces["LimitXLeft"].signalState !== "strongH"
      )
        this.interfaces["LimitXLeft"].changeDriver(GPIO.GPIOState.StrongHigh);
      else if (
        !event.detail.limitXLeft &&
        this.interfaces["LimitXLeft"].signalState !== "strongL"
      )
        this.interfaces["LimitXLeft"].changeDriver(GPIO.GPIOState.StrongLow);
    }

    if (this.interfaces["LimitXRight"]) {
      if (
        event.detail.limitXRight &&
        this.interfaces["LimitXRight"].signalState !== "strongH"
      )
        this.interfaces["LimitXRight"].changeDriver(GPIO.GPIOState.StrongHigh);
      else if (
        !event.detail.limitXRight &&
        this.interfaces["LimitXRight"].signalState !== "strongL"
      )
        this.interfaces["LimitXRight"].changeDriver(GPIO.GPIOState.StrongLow);
    }

    if (this.interfaces["LimitYTop"]) {
      if (
        event.detail.limitYTop &&
        this.interfaces["LimitYTop"].signalState !== "strongH"
      )
        this.interfaces["LimitYTop"].changeDriver(GPIO.GPIOState.StrongHigh);
      else if (
        !event.detail.limitYTop &&
        this.interfaces["LimitYTop"].signalState !== "strongL"
      )
        this.interfaces["LimitYTop"].changeDriver(GPIO.GPIOState.StrongLow);
    }

    if (this.interfaces["LimitYBottom"]) {
      if (
        event.detail.limitYBottom &&
        this.interfaces["LimitYBottom"].signalState !== "strongH"
      )
        this.interfaces["LimitYBottom"].changeDriver(GPIO.GPIOState.StrongHigh);
      else if (
        !event.detail.limitYBottom &&
        this.interfaces["LimitYBottom"].signalState !== "strongL"
      )
        this.interfaces["LimitYBottom"].changeDriver(GPIO.GPIOState.StrongLow);
    }

    this.requestUpdate();
  }
}
