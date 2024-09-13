import inquirer from "inquirer";
import { Project } from "../types.mjs";

export async function selectProject(projects: Project[]): Promise<Project> {
  const { project } = await inquirer.prompt<{ project: Project }>({
    name: "project",
    type: "list",
    message: "Choose a project",
    choices: projects.map((project) => {
      return {
        name: project.name,
        value: project,
      };
    }),
  });

  return project;
}
