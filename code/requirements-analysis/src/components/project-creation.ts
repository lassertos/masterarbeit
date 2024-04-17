import { customElement, query } from "lit/decorators.js";
import { LitElement, css, html } from "lit";
import { colors } from "../styles";

@customElement("rqa-project-creation")
export class ProjectCreation extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    input {
      padding: 0.5rem;
      border-radius: 0.5rem;
      border-width: 1px;
      font-family: inherit;
      font-size: large;
      font-weight: 500;
    }

    button {
      padding: 0.5rem;
      border-radius: 0.5rem;
      border-width: 0px;
      background-color: ${colors["orange-300"]};
      font-family: inherit;
      font-size: large;
      cursor: pointer;
      font-weight: 500;

      &:hover {
        background-color: ${colors["orange-400"]};
      }
    }
  `;

  @query("#input-name")
  inputName: HTMLInputElement;

  protected render(): unknown {
    return html` <input id="input-name" type="text" />
      <button @click=${() => this.createProject()}>Projekt erstellen</button>`;
  }

  createProject() {
    if (this.inputName.value)
      this.dispatchEvent(
        new CustomEvent<string>("create-project", {
          detail: this.inputName.value,
          bubbles: true,
          composed: true,
        })
      );
  }
}
