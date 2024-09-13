import path from "path";
import { ProjectDescriptionArray, Project } from "../types.mjs";

export function parseProjects(
  projects: ProjectDescriptionArray,
  basePath: string
): Project[] {
  const transformedProjects: Project[] = [];

  for (const project in projects) {
    const transformedProject: Project = {
      name: project,
      path: path.join(basePath, project),
      jobs: [],
    };

    for (const job in projects[project]) {
      transformedProject.jobs.push({
        project: project,
        name: job,
        path: path.join(basePath, project),
        commands: projects[project][job].commands,
        dependencies:
          projects[project][job].dependencies?.map((dependency) => {
            const [project, job] = dependency.split(":");
            return { project, job };
          }) ?? [],
      });
    }

    transformedProjects.push(transformedProject);
  }

  return transformedProjects;
}
