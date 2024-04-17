import { LitElement, html, css } from "lit";
import { customElement, property } from "lit/decorators.js";
import { Project } from "../model";
import { colors } from "../styles";

@customElement("rqa-project-list-item")
export class ProjectListItem extends LitElement {
  static styles = css`
    :host {
      width: 100%;
    }

    button {
      width: 100%;
      padding: 0.5rem;
      border-radius: 0.5rem;
      border-width: 0px;
      font-family: inherit;
      cursor: pointer;
      background-color: ${colors["blue-300"]};
      font-size: large;
      font-weight: 500;

      &:hover {
        background-color: ${colors["blue-400"]};
      }
    }
  `;

  @property({ attribute: false })
  project: Project;

  connectedCallback(): void {
    this.onclick = () => {
      this.dispatchEvent(new CustomEvent("select-project"));
    };
    super.connectedCallback();
  }

  protected render(): unknown {
    return html`<button>${this.project.name}</button>`;
  }
}
