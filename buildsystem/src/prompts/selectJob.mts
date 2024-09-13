import inquirer from "inquirer";
import { Job, Project } from "../types.mjs";

export async function selectJob(project: Project): Promise<Job> {
  const { job } = await inquirer.prompt<{ job: Job }>({
    name: "job",
    type: "list",
    message: "Choose a job",
    choices: project.jobs.map((job) => {
      return { name: job.name, value: job };
    }),
  });

  return job;
}
