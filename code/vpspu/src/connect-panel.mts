import { APIClient } from "@cross-lab-project/api-client";
import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";

@customElement("ecs-connect-panel")
export class EcsConnectPanel extends LitElement {
  protected createRenderRoot(): Element | ShadowRoot {
    return this;
  }

  constructor() {
    super();

    const queryParameters = new URLSearchParams(window.location.search);
    const instanceUrl = queryParameters.get("instanceUrl");
    const deviceToken = queryParameters.get("deviceToken");

    console.log("instanceUrl", instanceUrl);
    console.log("deviceToken", deviceToken);

    if (instanceUrl && deviceToken) {
      this.connect({ instanceUrl, deviceToken });
    }
  }

  protected render(): unknown {
    return html`<div
      class="bg-slate-700 drop-shadow-lg p-4 flex flex-col justify-center items-center rounded-xl"
    >
      <div class="flex flex-col mb-2">
        <label for="input-device-url" class="text-white">Device-URL</label>
        <input
          id="input-device-url"
          type="text"
          class="p-2 rounded-lg bg-slate-100"
        />
      </div>
      <div class="flex flex-col mb-4">
        <label for="input-device-token" class="text-white">Device-Token</label>
        <input
          id="input-device-token"
          type="text"
          class="p-2 rounded-lg bg-slate-100"
        />
      </div>
      <button
        @click=${this.connect}
        class="bg-slate-500 hover:bg-slate-400 active:bg-slate-300 p-2 w-full rounded-lg"
      >
        Connect
      </button>
    </div>`;
  }

  private async connect(data?: { instanceUrl: string; deviceToken: string }) {
    console.log("connecting", data);
    const instanceUrl =
      data?.instanceUrl ??
      (document.getElementById("input-device-url") as HTMLInputElement).value;
    const deviceToken =
      data?.deviceToken ??
      (document.getElementById("input-device-token") as HTMLInputElement).value;

    const apiUrl = instanceUrl.slice(0, instanceUrl.indexOf("/devices/"));
    const apiClient = new APIClient(apiUrl, deviceToken);
    const websocketToken = await apiClient.createWebsocketToken(instanceUrl);

    const connectionDataEvent = new CustomEvent("connection-data", {
      detail: {
        deviceUrl: instanceUrl,
        websocketUrl:
          apiUrl.replace("http", "ws") +
          (apiUrl.endsWith("/") ? "devices/websocket" : "/devices/websocket"),
        websocketToken,
      },
    });

    this.dispatchEvent(connectionDataEvent);
  }
}
