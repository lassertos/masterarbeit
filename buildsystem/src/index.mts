import YAML from "yaml";
import fs from "fs";
import { isProjectDescriptionArray } from "./types.mjs";
import { selectProject } from "./prompts/selectProject.mjs";
import { selectJob } from "./prompts/selectJob.mjs";
import { selectVariant } from "./prompts/selectVariant.mjs";
import path from "path";
import { parseProjects } from "./utils/parseProjects.mjs";
import { parseJobs } from "./utils/parseJobs.mjs";
import { buildDependencyGraph } from "./utils/buildDependencyGraph.mjs";
import { executeDependencyGraph } from "./utils/executeDependencyGraph.mjs";
import { terminal } from "./utils/terminal.mjs";
import { parseArgs } from "util";

const args = parseArgs({
  allowPositionals: true,
  options: {
    path: {
      type: "string",
    },
    project: {
      type: "string",
    },
    job: {
      type: "string",
    },
    variant: {
      type: "string",
    },
  },
  args: process.argv,
});

if (!args.values.path) {
  throw new Error('The option "--path" is required!');
}

const basePath = args.values.path;
const data = fs.readFileSync(path.join(basePath, ".buildsystem.yml"), {
  encoding: "utf8",
});
const projectDescriptions = YAML.parse(data);

if (!isProjectDescriptionArray(projectDescriptions)) {
  throw new Error("Projects file is malformed!");
}

const projects = parseProjects(projectDescriptions, basePath);
const jobs = parseJobs(projects);

terminal.clear();

const project = args.values.project
  ? projects.find((project) => project.name === args.values.project)
  : await selectProject(projects);

if (!project) {
  throw new Error(`Could not find a registered project at "${process.cwd()}"!`);
}

const job = args.values.job
  ? project.jobs.find((job) => job.name === args.values.job)
  : await selectJob(project);

if (!job) {
  throw new Error(
    `Could not find job "${args.values.job}" for project "${project.name}"!`
  );
}

const variant = args.values.variant
  ? args.values.variant
  : await selectVariant();

if (variant !== "clean" && variant !== "normal" && variant !== "retry") {
  throw new Error(`"${args.values.variant}" is not a valid execution variant!`);
}

const dependencyGraph = buildDependencyGraph(job, jobs);
await executeDependencyGraph(dependencyGraph, variant);
