import { BrowserWindow, ipcMain } from "electron";
import { ApplicationDatabase } from "./database";
import { Project, Requirement } from "./model";

export class RequestHandler {
  private window: BrowserWindow;
  private database: ApplicationDatabase;

  constructor(window: BrowserWindow, database: ApplicationDatabase) {
    this.window = window;
    this.database = database;
    ipcMain.on("list-projects", () => this.handleListProjects());
    ipcMain.on("create-project", (_event, name) =>
      this.handleCreateProject(name)
    );
    ipcMain.on("update-project", (_event, project) =>
      this.handleUpdateProject(project)
    );
    ipcMain.on("create-requirement", (_event, project) =>
      this.handleCreateRequirement(project)
    );
    ipcMain.on("save-requirement", (_event, requirement) =>
      this.handleSaveRequirement(requirement)
    );
    ipcMain.on("get-project", (_event, id) => this.handleGetProject(id));
  }

  async initialize() {
    await this.database.initialize();
  }

  async handleListProjects() {
    const projects = await this.database.listProjects();
    this.window.webContents.send("list-projects", projects);
  }

  async handleCreateProject(name: string) {
    const project = await this.database.createProject(name);
    this.window.webContents.send("create-project", project);
  }

  async handleUpdateProject(project: Project) {
    const updatedProject = await this.database.updateProject(project);
    this.window.webContents.send("update-project", updatedProject);
  }

  async handleCreateRequirement(project: Project) {
    const requirement = await this.database.createRequirement(project);
    this.window.webContents.send("create-requirement", requirement);
  }

  async handleSaveRequirement(requirement: Requirement) {
    const savedRequirement = await this.database.saveRequirement(requirement);
    this.window.webContents.send("save-requirement", savedRequirement);
  }

  async handleGetProject(id: string) {
    const project = await this.database.getProject(id);
    this.window.webContents.send("get-project", project);
  }
}
