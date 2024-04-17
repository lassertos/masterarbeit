import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Requirement } from "../model";
import { colors } from "../styles";

@customElement("rqa-requirement-list")
export class RequirementList extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow: auto;
    }

    button {
      width: fit-content;
      margin-top: 2rem;
      padding: 1rem;
      border-radius: 1rem;
      border-width: 0px;
      font-family: inherit;
      font-size: large;
      font-weight: 500;
      background-color: ${colors["orange-300"]};
      cursor: pointer;

      &:hover {
        background-color: ${colors["orange-400"]};
      }
    }

    #container {
      margin: 2rem;
      width: calc(100% - 4rem);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 1.25rem;
    }
  `;

  @property({ type: Array })
  requirements: Requirement[];

  protected render(): unknown {
    return html`
      <button @click=${() => this.createRequirement()}>
        Anforderung hinzufügen
      </button>
      <div id="container">
        ${this.requirements.map(
          (requirement, index) =>
            html` <rqa-requirement-list-item
              .requirement=${requirement}
              .index=${index}
            ></rqa-requirement-list-item>`
        )}
      </div>
    `;
  }

  private createRequirement() {
    this.dispatchEvent(
      new CustomEvent("create-requirement", { bubbles: true, composed: true })
    );
  }
}
