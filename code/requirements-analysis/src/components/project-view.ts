import { LitElement, css, html } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { Project, Requirement } from "../model";
import { colors } from "../styles";

@customElement("rqa-project-view")
export class ProjectView extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }

    input {
      padding: 0.5rem;
      border-radius: 0.5rem;
      border-width: 0px;
      text-align: center;
      font-size: xx-large;
      color: white;
      flex-grow: 1;
      margin-left: 0.5rem;
      margin-right: 0.5rem;
      background: none;
      font-family: inherit;

      &:focus {
        outline: none;
      }
    }

    #header {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 4rem;
      background-color: ${colors["blue-800"]};
      box-sizing: border-box;
    }
  `;

  @property({ attribute: false })
  project: Project;

  @state()
  isEditingRequirement = false;

  @state()
  editedRequirement?: Requirement;

  @query("#input-name")
  inputName: HTMLInputElement;

  protected render(): unknown {
    return this.isEditingRequirement
      ? html`<rqa-requirement-editor
          .requirement=${this.editedRequirement}
        ></rqa-requirement-editor>`
      : html` <div id="header">
            <input
              id="input-name"
              type="text"
              placeholder="Projektname"
              value=${this.project.name}
              @input=${() => this.updateProject()}
            />
          </div>
          <rqa-requirement-list .requirements=${this.project.requirements}>
          </rqa-requirement-list>`;
  }

  private updateProject() {
    this.project.name = this.inputName.value;
    this.dispatchEvent(
      new CustomEvent<Project>("update-project", {
        detail: this.project,
        bubbles: true,
        composed: true,
      })
    );
  }
}
