import { html, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("ecs-device-panel")
export class EcsDevicePanel extends LitElement {
  @property({ type: Boolean })
  xMotorLeft: boolean = false;

  @property({ type: Boolean })
  xMotorRight: boolean = false;

  @property({ type: Boolean })
  yMotorTop: boolean = false;

  @property({ type: Boolean })
  yMotorBottom: boolean = false;

  @state()
  private limitXLeft: boolean = false;

  @state()
  private limitXRight: boolean = false;

  @state()
  private limitYTop: boolean = false;

  @state()
  private limitYBottom: boolean = false;

  @state()
  private positionX: number = 0;

  @state()
  private positionY: number = 0;

  @state()
  private lastUpdated: number;

  @state()
  private speed: number = 400;

  constructor() {
    super();

    this.lastUpdated = Date.now();
    setInterval(() => this.updatePosition(), 16);
  }

  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }

  protected render(): unknown {
    return html`<div
        class="h-24 w-[calc(100%-4rem)] mx-8 flex items-center justify-center"
      >
        <span
          class="material-symbols-outlined border-2 ${this.xMotorLeft
            ? "bg-green-500"
            : "bg-gray-500"}"
          >arrow_back</span
        >
        <span
          class="material-symbols-outlined border-2 ${this.yMotorBottom
            ? "bg-green-500"
            : "bg-gray-500"}"
          >arrow_downward</span
        >
        <span
          class="material-symbols-outlined border-2 ${this.yMotorTop
            ? "bg-green-500"
            : "bg-gray-500"}"
          >arrow_upward</span
        >
        <span
          class="material-symbols-outlined border-2 ${this.xMotorRight
            ? "bg-green-500"
            : "bg-gray-500"}"
          >arrow_forward</span
        >
      </div>
      <div
        id="devicebox"
        class="w-[calc(100%-4rem)] h-[calc(100%-8rem)] mx-8 mb-8 border-4 border-black ${this
          .limitXLeft
          ? "border-l-red-600"
          : ""} ${this.limitXRight ? "border-r-red-600" : ""} ${this.limitYTop
          ? "border-t-red-600"
          : ""} ${this.limitYBottom ? "border-b-red-600" : ""}"
      >
        ${this.renderBox()}
      </div>`;
  }

  private renderBox() {
    const box = document.createElement("div");
    box.classList.add("w-[100px]", "h-[100px]", "bg-slate-700", "relative");
    box.style.left = `${this.positionX}px`;
    box.style.top = `${this.positionY}px`;
    return box;
  }

  private updatePosition() {
    const rawHeight = document
      .getElementById("devicebox")
      ?.getBoundingClientRect().height;
    const rawWidth = document
      .getElementById("devicebox")
      ?.getBoundingClientRect().width;
    const height = rawHeight ? rawHeight - 8 : 0;
    const width = rawWidth ? rawWidth - 8 : 0;
    const delta = Date.now() - this.lastUpdated;
    const distance = (delta / 1000) * this.speed;

    if (this.xMotorLeft) this.positionX -= distance;
    if (this.xMotorRight) this.positionX += distance;
    if (this.yMotorTop) this.positionY -= distance;
    if (this.yMotorBottom) this.positionY += distance;

    this.positionX = Math.max(Math.min(this.positionX, width - 100), 0);
    this.positionY = Math.max(Math.min(this.positionY, height - 100), 0);

    if (this.positionX === 0) this.limitXLeft = true;
    else this.limitXLeft = false;
    if (this.positionX === width - 100) this.limitXRight = true;
    else this.limitXRight = false;
    if (this.positionY === 0) this.limitYTop = true;
    else this.limitYTop = false;
    if (this.positionY === height - 100) this.limitYBottom = true;
    else this.limitYBottom = false;

    const positionUpdatedEvent = new CustomEvent("position-updated", {
      detail: {
        x: this.positionX,
        y: this.positionY,
        limitXLeft: this.limitXLeft,
        limitXRight: this.limitXRight,
        limitYTop: this.limitYTop,
        limitYBottom: this.limitYBottom,
      },
      bubbles: true,
    });

    this.dispatchEvent(positionUpdatedEvent);

    this.lastUpdated = Date.now();

    this.requestUpdate();
  }
}
