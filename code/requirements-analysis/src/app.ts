import { LitElement, css, html } from "lit";
import { customElement, state } from "lit/decorators.js";
import { Project, Requirement } from "./model";
import { Task } from "@lit/task";
import { colors } from "./styles";

@customElement("rqa-application")
export class Application extends LitElement {
  static styles = css`
    :host {
      width: 100%;
      height: 100%;
      display: flex;
      /* background-color: ${colors["blue-100"]}; */
      box-sizing: border-box;
    }

    #container {
      width: 100%;
      height: 100%;
      display: flex;
      /* padding: 2rem; */
      box-sizing: border-box;
    }
  `;

  @state()
  private projects: Project[] = [];

  @state()
  private selectedProject?: Project;

  @state()
  private currentRequirement?: Requirement;

  @state()
  private requirementEditorMode: "create" | "update" = "create";

  constructor() {
    super();
    this._productTask.run();
  }

  private _productTask = new Task(this, {
    task: async () => {
      this.projects = await window.electronAPI.listProjects();
    },
  });

  protected render(): unknown {
    return this._productTask.render({
      initial: () => html`<span>initial</span>`,
      pending: () => html`<span>pending</span>`,
      complete: () => html`
        <div id="container">
          ${this.selectedProject
            ? this.currentRequirement
              ? html`<rqa-requirement-editor
                  .requirement=${this.currentRequirement}
                  .mode=${this.requirementEditorMode}
                  @requirement-editor-save-close=${() =>
                    this.requirementEditorSaveAndClose()}
                  @requirement-editor-save-next=${() =>
                    this.requirementEditorSaveAndNext()}
                  @requirement-editor-cancel=${() =>
                    this.requirementEditorCancel()}
                ></rqa-requirement-editor>`
              : html`<rqa-project-view
                  .project=${this.selectedProject}
                  @update-project=${(event: CustomEvent<Project>) =>
                    this.updateProject(event.detail)}
                  @create-requirement=${() => this.createRequirement()}
                  @edit-requirement=${(event: CustomEvent<number>) =>
                    this.editRequirement(event.detail)}
                  @delete-requirement=${(event: CustomEvent<number>) =>
                    this.deleteRequirement(event.detail)}
                ></rqa-project-view>`
            : html`<rqa-project-selection
                .projects=${this.projects}
                @select-project=${(event: CustomEvent<Project>) =>
                  this.selectProject(event.detail)}
                @create-project=${(event: CustomEvent<string>) =>
                  this.createProject(event.detail)}
              ></rqa-project-selection>`}
        </div>
      `,
      error: () => html`<span>error</span>`,
    });
  }

  private selectProject(project: Project) {
    console.log("selecting project", project);
    this.selectedProject = project;
  }

  private async createProject(name: string) {
    console.log("creating project", name);
    const project = await window.electronAPI.createProject(name);
    this.projects = this.projects.concat(project);
    this.selectProject(project);
  }

  private async updateProject(project: Project) {
    console.log("updating project", project);
    const index = this.projects.findIndex((p) => p === this.selectedProject);
    this.projects.splice(index, 1);
    const updatedProject = await window.electronAPI.updateProject(project);
    this.projects.push(updatedProject);
    this.selectedProject = updatedProject;
  }

  private async createRequirement() {
    console.log("creating requirement");
    this.requirementEditorMode = "create";
    this.currentRequirement = await window.electronAPI.createRequirement(
      this.selectedProject
    );
  }

  private async requirementEditorSaveAndClose() {
    console.log(
      await window.electronAPI.saveRequirement(this.currentRequirement)
    );
    console.log(this.currentRequirement);
    this.currentRequirement = undefined;
    const index = this.projects.findIndex((p) => p === this.selectedProject);
    this.projects.splice(index, 1);
    const reloadedProject = await window.electronAPI.getProject(
      this.selectedProject.id
    );
    this.projects.push(reloadedProject);
    this.selectedProject = reloadedProject;
    console.log(this.selectedProject);
  }

  private async requirementEditorSaveAndNext() {
    await window.electronAPI.saveRequirement(this.currentRequirement);
    this.currentRequirement = undefined;
    this.currentRequirement = await window.electronAPI.createRequirement(
      this.selectedProject
    );
    const index = this.projects.findIndex((p) => p === this.selectedProject);
    this.projects.splice(index, 1);
    const reloadedProject = await window.electronAPI.getProject(
      this.selectedProject.id
    );
    this.projects.push(reloadedProject);
    this.selectedProject = reloadedProject;
  }

  private async requirementEditorCancel() {
    console.log("cancelling editing of requirement");
    this.currentRequirement = undefined;
  }

  private editRequirement(index: number) {
    this.requirementEditorMode = "update";
    this.currentRequirement = this.selectedProject?.requirements[index];
  }

  private deleteRequirement(index: number) {
    this.selectedProject.requirements.splice(index);
  }
}
