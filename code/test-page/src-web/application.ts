import { ExperimentServiceTypes } from "@cross-lab-project/api-client";
import { css, CSSResultGroup, html, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("test-page-application")
export class Application extends LitElement {
  static styles: CSSResultGroup = css``;

  @property({ type: Object })
  experiment?: ExperimentServiceTypes.Experiment;

  protected render(): unknown {
    console.log(this.experiment);
    return html` ${this.experiment
      ? html`<test-page-experiment-view
          .experiment=${this.experiment}
        ></test-page-experiment-view>`
      : html`<test-page-experiment-selection
          @experiment=${({ detail: experiment }: any) => {
            this.experiment = experiment;
            this.requestUpdate();
          }}
        ></test-page-experiment-selection>`}`;
  }
}
