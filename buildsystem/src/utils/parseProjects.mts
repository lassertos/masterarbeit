import path from "path";
import { ProjectDescriptionArray, Project } from "../types.mjs";

export function parseProjects(
  projects: ProjectDescriptionArray,
  basePath: string
): Project[] {
  const transformedProjects: Project[] = [];

  for (const project in projects) {
    const projectPath = path.join(basePath, projects[project].path);

    const transformedProject: Project = {
      name: project,
      path: projectPath,
      jobs: [],
    };

    for (const job in projects[project].jobs) {
      transformedProject.jobs.push({
        project: project,
        name: job,
        path: projectPath,
        commands: projects[project].jobs[job].commands,
        dependencies:
          projects[project].jobs[job].dependencies?.map((dependency) => {
            const [project, job] = dependency.split(":");
            return {
              project,
              job,
              path: path.join(basePath, projects[project].path),
            };
          }) ?? [],
      });
    }

    transformedProjects.push(transformedProject);
  }

  return transformedProjects;
}
