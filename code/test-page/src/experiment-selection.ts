import { html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { templates } from "./experiment-configurations/index.js";
import {
  APIClient,
  ExperimentServiceTypes,
} from "@cross-lab-project/api-client";
import { configuration } from "./configuration.js";

@customElement("experiment-selection")
export class ExperimentSelection extends LitElement {
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
