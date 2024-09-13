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

const basePath = path.resolve(process.argv[2]);
const data = fs.readFileSync(path.join(basePath, ".jobs.yml"), {
  encoding: "utf8",
});
const projectDescriptions = YAML.parse(data);

if (!isProjectDescriptionArray(projectDescriptions)) {
  throw new Error("Projects file is malformed!");
}

const projects = parseProjects(projectDescriptions, basePath);
const jobs = parseJobs(projects);

terminal.clear();
const project = await selectProject(projects);
const job = await selectJob(project);
const variant = await selectVariant();

const dependencyGraph = buildDependencyGraph(job, jobs);
await executeDependencyGraph(dependencyGraph, variant);
