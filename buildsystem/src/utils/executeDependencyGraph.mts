import fs from "fs";
import { DirectedGraph } from "../classes/directedGraph.mjs";
import { Job, JobStatus } from "../types.mjs";
import { renderExecution } from "./terminal.mjs";
import { exec, spawn } from "child_process";
import path from "path";
import { hashElement } from "folder-hash";

export async function executeDependencyGraph(
  dependencyGraph: DirectedGraph<Job>,
  variant: "normal" | "clean"
) {
  const statusMap: Map<string, JobStatus> = new Map();
  const promiseMap: Map<string, Promise<JobStatus>> = new Map();

  for (const node of dependencyGraph.nodes) {
    statusMap.set(node.name, "waiting");
  }

  const finishRender = renderExecution(statusMap);

  for (const root of dependencyGraph.roots) {
    promiseMap.set(
      root.name,
      executeNode(root, dependencyGraph, statusMap, promiseMap)
    );
  }

  await Promise.all(promiseMap.values());

  finishRender();
}

async function executeNode(
  node: { name: string; data: Job },
  dependencyGraph: DirectedGraph<Job>,
  statusMap: Map<string, JobStatus>,
  promiseMap: Map<string, Promise<JobStatus>>
): Promise<JobStatus> {
  const promise = promiseMap.get(node.name)!;
  if (promise) {
    return await promise;
  }

  const descendants = dependencyGraph.getDescendants(node.name);

  if (descendants.length > 0) {
    descendants.forEach((descendant) => {
      if (!promiseMap.has(descendant.name)) {
        promiseMap.set(
          descendant.name,
          executeNode(descendant, dependencyGraph, statusMap, promiseMap)
        );
      }
    });

    const results = await Promise.all(
      descendants.map((descendant) => promiseMap.get(descendant.name))
    );

    if (
      results.includes("failed") ||
      results.includes("skipped-failed") ||
      results.includes("dependency-failed")
    ) {
      return "dependency-failed";
    }
  }

  statusMap.set(node.name, "running");
  const result = await executeJob(node.data);
  statusMap.set(node.name, result);
  return result;
}

async function executeJob(job: Job): Promise<"success" | "failed"> {
  const buildsystemPath = path.join(job.path, ".buildsystem");
  const metadataPath = path.join(buildsystemPath, "meta.json");
  const logPath = path.join(buildsystemPath, "log.txt");

  const hash = (
    await hashElement(job.path, {
      folders: { exclude: ["node_modules", ".buildsystem", "dist"] },
    })
  ).hash;

  if (!fs.existsSync(buildsystemPath)) {
    fs.mkdirSync(buildsystemPath);
  }

  const metadata = fs.existsSync(metadataPath)
    ? JSON.parse(fs.readFileSync(metadataPath, { encoding: "utf-8" }))
    : {};

  if (metadata?.hash && metadata?.status) {
    if (metadata.hash === hash) return metadata.status;
  }

  fs.rmSync(logPath, { force: true });

  const preparationSuccessful = await new Promise<boolean>((resolve) => {
    if (job.commands.prepare) {
      const args = job.commands.prepare.split(" ");
      const jobProcess = spawn(args[0], args.slice(1), { cwd: job.path });

      jobProcess.stdout.on("data", (data) => {
        fs.appendFileSync(logPath, data.toString());
      });

      jobProcess.stderr.on("data", (data) => {
        fs.appendFileSync(logPath, data.toString());
      });

      jobProcess.on("exit", (code) => {
        if (code === 0) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    } else {
      resolve(true);
    }
  });

  if (!preparationSuccessful) {
    fs.writeFileSync(
      metadataPath,
      JSON.stringify({ status: "failed" }, null, 4)
    );

    return "failed";
  }

  const executionSuccessful = await new Promise<boolean>((resolve) => {
    const args = job.commands.execute.split(" ");
    const jobProcess = spawn(args[0], args.slice(1), { cwd: job.path });

    jobProcess.stdout.on("data", (data) => {
      fs.appendFileSync(logPath, data.toString());
    });

    jobProcess.stderr.on("data", (data) => {
      fs.appendFileSync(logPath, data.toString());
    });

    jobProcess.on("exit", (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
  });

  const result = executionSuccessful ? "success" : "failed";

  fs.writeFileSync(
    metadataPath,
    JSON.stringify({ hash, status: result }, null, 4)
  );

  return result;
}
