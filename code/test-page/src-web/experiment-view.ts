import { ExperimentServiceTypes } from "@cross-lab-project/api-client";
import { css, CSSResultGroup, html, LitElement, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";

@customElement("test-page-experiment-view")
export class ExperimentView extends LitElement {
  static styles: CSSResultGroup = css`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
    }
    iframe {
      position: absolute;
      width: 100%;
      height: calc(100% - 2rem);
      border: none;
    }
    #loading-container {
      position: absolute;
      display: flex;
      justify-content: center;
      align-items: center;
      background-color: white;
      width: 100vw;
      height: 100vh;
    }
    #container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
    }
    #footer {
      display: flex;
      width: 100%;
      height: 2rem;
      gap: 0.5rem;
      margin-top: auto;
    }
  `;

  @property({ type: Object })
  experiment!: ExperimentServiceTypes.Experiment;

  @state()
  devicesRendered: boolean = false;

  iframes: HTMLIFrameElement[] = [];

  protected firstUpdated(_changedProperties: PropertyValues): void {
    this.updateComplete.then(() =>
      setTimeout(() => {
        this.renderRoot.querySelectorAll("iframe").forEach((iframe) => {
          iframe.style.zIndex = "-1";
          if (iframe.id === "device-0") {
            iframe.style.zIndex = "1";
          }
        });
        this.devicesRendered = true;
        this.requestUpdate();
      }, 1000)
    );
  }

  protected render(): unknown {
    return html`${!this.devicesRendered
        ? html`<div id="loading-container">
            <test-page-loader></test-page-loader>
          </div>`
        : html``}
      <div id="container">
        ${this.experiment.instantiatedDevices.map(
          (instantiatedDevice, index) => {
            const url = new URL(instantiatedDevice.codeUrl);
            url.searchParams.set("instanceUrl", instantiatedDevice.url);
            url.searchParams.set("deviceToken", instantiatedDevice.token);
            if (!this.iframes[index]) {
              const iframe = document.createElement("iframe");
              iframe.src = url.toString();
              iframe.id = `device-${index}`;
              iframe.addEventListener("load", () => {
                iframe.contentWindow?.postMessage(
                  {
                    role: this.experiment.devices[index].role,
                    experimentUrl: this.experiment.url,
                    ...this.experiment.roles.find(
                      (role) =>
                        role.name === this.experiment.devices[index].role
                    )?.configuration,
                  },
                  "*"
                );
              });
              this.iframes.push(iframe);
            }
            return html` ${this.iframes[index]} `;
          }
        )}
        <div id="footer">
          ${this.experiment.instantiatedDevices.map(
            (instantiatedDevice, index) => {
              return html`
                <button
                  @click=${() => {
                    this.renderRoot
                      .querySelectorAll("iframe")
                      .forEach((iframe) => {
                        console.log(iframe.id, "device-" + index);
                        iframe.style.zIndex = "-1";
                        if (iframe.id === "device-" + index) {
                          iframe.style.zIndex = "1";
                        }
                      });
                  }}
                >
                  ${instantiatedDevice.name}
                </button>
              `;
            }
          )}
        </div>
      </div>`;
  }
}
