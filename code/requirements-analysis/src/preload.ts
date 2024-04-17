// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";
import { Project, Requirement } from "./model";

declare global {
  interface Window {
    electronAPI: {
      listProjects: () => Promise<Project[]>;
      createProject: (name: string) => Promise<Project>;
      updateProject: (project: Project) => Promise<Project>;
      createRequirement: (project: Project) => Promise<Requirement>;
      saveRequirement: (requirement: Requirement) => Promise<Requirement>;
      getProject: (id: string) => Promise<Project>;
    };
  }
  //...
}

contextBridge.exposeInMainWorld("electronAPI", {
  listProjects: async () => {
    const projects = new Promise<Project[]>((resolve) => {
      ipcRenderer.once("list-projects", (_event, value) => resolve(value));
    });
    ipcRenderer.send("list-projects");
    return projects;
  },
  createProject: async (name: string) => {
    const project = new Promise<Project[]>((resolve) => {
      ipcRenderer.once("create-project", (_event, value) => resolve(value));
    });
    ipcRenderer.send("create-project", name);
    return project;
  },
  updateProject: async (project: Project) => {
    const updatedProject = new Promise<Project[]>((resolve) => {
      ipcRenderer.once("update-project", (_event, value) => resolve(value));
    });
    ipcRenderer.send("update-project", project);
    return updatedProject;
  },
  createRequirement: async (project: Project) => {
    const requirement = new Promise<Requirement>((resolve) => {
      ipcRenderer.once("create-requirement", (_event, value) => resolve(value));
    });
    ipcRenderer.send("create-requirement", project);
    return requirement;
  },
  saveRequirement: async (requirement: Requirement) => {
    const savedRequirement = new Promise<Requirement>((resolve) => {
      ipcRenderer.once("save-requirement", (_event, value) => resolve(value));
    });
    ipcRenderer.send("save-requirement", requirement);
    return savedRequirement;
  },
  getProject: async (id: string) => {
    const project = new Promise<Project>((resolve) => {
      ipcRenderer.once("get-project", (_event, value) => resolve(value));
    });
    ipcRenderer.send("get-project", id);
    return project;
  },
});
