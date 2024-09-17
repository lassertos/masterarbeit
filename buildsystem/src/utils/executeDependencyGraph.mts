import fs from "fs";
import { DirectedGraph } from "../classes/directedGraph.mjs";
import { Job, JobStatus } from "../types.mjs";
import { renderExecution } from "./terminal.mjs";
import { spawn } from "child_process";
import path from "path";
import { hashElement } from "folder-hash";
import { helperFunctions } from "../helper-functions/index.mjs";

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
      executeNode(root, dependencyGraph, variant, statusMap, promiseMap)
    );
  }

  await Promise.all(promiseMap.values());

  finishRender();
}

async function executeNode(
  node: { name: string; data: Job },
  dependencyGraph: DirectedGraph<Job>,
  variant: "normal" | "clean",
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
          executeNode(
            descendant,
            dependencyGraph,
            variant,
            statusMap,
            promiseMap
          )
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
  const result = await executeJob(node.data, variant);
  statusMap.set(node.name, result);
  return result;
}

async function executeJob(
  job: Job,
  variant: "normal" | "clean"
): Promise<"success" | "failed"> {
  const buildsystemPath = path.join(job.path, ".buildsystem");
  const metadataPath = path.join(buildsystemPath, `${job.name}.json`);
  const logPath = path.join(buildsystemPath, `${job.name}.log`);

  const hash = (
    await hashElement(job.path, {
      folders: {
        exclude: ["node_modules", ".buildsystem", "dist", "app", "lib"],
      },
    })
  ).hash;

  if (variant === "clean") {
    fs.rmSync(metadataPath, { recursive: true, force: true });
    fs.rmSync(logPath, { recursive: true, force: true });
  }

  if (!fs.existsSync(buildsystemPath)) {
    fs.mkdirSync(buildsystemPath);
  }

  const metadata = fs.existsSync(metadataPath)
    ? JSON.parse(fs.readFileSync(metadataPath, { encoding: "utf-8" }))
    : {};

  if (metadata?.hash && metadata?.status) {
    let hashesMatch = true;

    if (metadata.hash !== hash) {
      hashesMatch = false;
    }

    for (const dependency of job.dependencies) {
      const savedDependencyHash = metadata?.dependencies
        ? metadata.dependencies[dependency.project]
          ? metadata.dependencies[dependency.project][dependency.job]
          : undefined
        : undefined;
      const newDependencyHash = (
        await hashElement(dependency.path, {
          folders: {
            exclude: ["node_modules", ".buildsystem", "dist", "app", "lib"],
          },
        })
      ).hash;

      if (!savedDependencyHash || savedDependencyHash !== newDependencyHash) {
        hashesMatch = false;
        break;
      }
    }

    if (hashesMatch) return metadata.status;
  }

  fs.rmSync(logPath, { force: true });

  if (job["helper-functions"]?.before) {
    for (const helperFunction of job["helper-functions"].before) {
      if (!(helperFunction in helperFunctions)) {
        throw new Error(`"${helperFunction}" is not a valid helper function!`);
      }
      try {
        helperFunctions[helperFunction](job);
      } catch (error) {
        if (error instanceof Error) {
          fs.appendFileSync(logPath, error.message);
          fs.writeFileSync(
            metadataPath,
            JSON.stringify({ status: "failed" }, null, 4)
          );

          return "failed";
        }
      }
    }
  }

  const preparationSuccessful = await new Promise<boolean>((resolve) => {
    if (job.commands.prepare) {
      const args = job.commands.prepare.split(" ");
      const jobProcess = spawn(args[0], args.slice(1), {
        cwd: job.path,
        shell: "/bin/bash",
      });

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
    fs.appendFileSync(logPath, job.path + "\n");
    const jobProcess = spawn(args[0], args.slice(1), {
      cwd: job.path,
      shell: "/bin/bash",
    });

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

  if (job["helper-functions"]?.after) {
    for (const helperFunction of job["helper-functions"].after) {
      if (!(helperFunction in helperFunctions)) {
        throw new Error(`"${helperFunction}" is not a valid helper function!`);
      }
      try {
        helperFunctions[helperFunction](job);
      } catch (error) {
        if (error instanceof Error) {
          fs.appendFileSync(logPath, error.message);
          fs.writeFileSync(
            metadataPath,
            JSON.stringify({ status: "failed" }, null, 4)
          );

          return "failed";
        }
      }
    }
  }

  const meta: {
    hash: string;
    status: JobStatus;
    dependencies: { [k: string]: { [k: string]: string } };
  } = {
    hash,
    status: result,
    dependencies: {},
  };

  for (const dependency of job.dependencies) {
    if (!meta.dependencies[dependency.project]) {
      meta.dependencies[dependency.project] = {};
    }

    meta.dependencies[dependency.project][dependency.job] = (
      await hashElement(dependency.path, {
        folders: {
          exclude: ["node_modules", ".buildsystem", "dist", "app", "lib"],
        },
      })
    ).hash;
  }

  fs.writeFileSync(metadataPath, JSON.stringify(meta, null, 4));

  return result;
}
