import { Project } from "../types.mjs";

export function parseJobs(projects: Project[]) {
  return projects.flatMap((project) => project.jobs);
}
