import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import { colors } from "../styles";
import { Project } from "../model";

@customElement("rqa-project-selection")
export class ProjectSelection extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      box-sizing: border-box;
    }

    #header {
      display: flex;
      justify-content: center;
      align-items: center;
      width: 100%;
      height: 4rem;
      background-color: ${colors["blue-800"]};
      flex-shrink: 0;
    }

    #content {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      gap: 2rem;
      padding: 2rem;
      box-sizing: border-box;
    }

    span {
      color: white;
      font-size: xx-large;
    }

    #project-creation-container {
      padding: 1rem;
      border-radius: 1rem;
      background-color: ${colors["orange-50"]};
      filter: drop-shadow(2px 4px 6px ${colors["orange-900"]});
    }
  `;

  @property({ type: Array })
  projects: Project[];

  protected render(): unknown {
    return html`
      <div id="header">
        <span class="roboto-bold">Projektauswahl</span>
      </div>
      <div id="content">
        <div id="project-creation-container">
          <rqa-project-creation></rqa-project-creation>
        </div>
        <div id="project-list-container">
          <rqa-project-list .projects=${this.projects}></rqa-project-list>
        </div>
      </div>
    `;
  }
}
