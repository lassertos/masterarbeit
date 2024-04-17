import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import { Project } from "../model";
import { colors } from "../styles";

@customElement("rqa-project-list")
export class ProjectList extends LitElement {
  static styles = css`
    input {
      padding: 0.5rem;
      border-radius: 0.5rem;
      border-width: 1px;
    }

    button {
      padding: 0.5rem;
      border-radius: 0.5rem;
      border-width: 0px;
    }

    #project-container {
      display: flex;
      flex-direction: column;
      padding: 1rem;
      border-radius: 1rem;
      gap: 1rem;
      background-color: ${colors["blue-50"]};
      filter: drop-shadow(2px 4px 6px ${colors["blue-900"]});
    }
  `;

  @query("#input-name")
  inputName: HTMLInputElement;

  @property({ type: Array })
  projects: Project[];

  protected render(): unknown {
    console.log(this.projects);
    return html`
      <div id="project-container">
        ${this.projects.map(
          (project) =>
            html`<rqa-project-list-item
              .project=${project}
              @select-project=${() => this.selectProject(project)}
            ></rqa-project-list-item>`
        )}
      </div>
    `;
  }

  private selectProject(project: Project) {
    this.dispatchEvent(
      new CustomEvent<Project>("select-project", {
        detail: project,
        bubbles: true,
        composed: true,
      })
    );
  }
}
