import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { templates } from "./experiment-configurations/index.js";
import {
  APIClient,
  ExperimentServiceTypes,
} from "@cross-lab-project/api-client";
import { configuration } from "./configuration.js";

@customElement("experiment-selection")
export class ExperimentSelection extends LitElement {
  static styles: CSSResultGroup = css`
    :host {
      display: flex;
      width: 100%;
      height: 100%;
      justify-content: center;
      align-items: center;
      background-color: #f3f6f7;
    }

    div {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      border: solid;
      border-width: 1px;
      border-radius: 10px;
      padding: 1.5rem;
      background-color: white;
    }

    button {
      border-radius: 5px;
      background-color: #c1e6eb;
      border: none;
      padding: 0.5rem;
      font-family: Roboto;
      font-size: large;
    }

    button:hover {
      background-color: #92d4dd;
    }

    button:active {
      background-color: #64c2ce;
    }
  `;

  protected render(): unknown {
    return html`
      <div>
        ${templates.map(
          (template) =>
            html`<button @click="${this._handleClick(template)}">
              ${template.name}
            </button>`
        )}
      </div>
    `;
  }

  private _handleClick(template: ExperimentServiceTypes.Template<"request">) {
    return async () => {
      const apiClient = new APIClient(configuration.apiUrl);

      await apiClient.login(configuration.username, configuration.password);

      const experiment = await apiClient.createExperiment({
        status: "running",
        ...template.configuration,
      });

      console.log(experiment);

      for (const instance of experiment.instantiatedDevices) {
        const url = new URL(instance.codeUrl);
        url.searchParams.set("instanceUrl", instance.url);
        url.searchParams.set("deviceToken", instance.token);
        open(url);
      }
    };
  }
}
