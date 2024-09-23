import { createHash } from "crypto";
import fs from "fs";
import { Job } from "../types.mjs";
import path from "path";
import { globSync } from "glob";

export function hashJob(job: Job) {
  const hasher = createHash("sha256");
  hasher.setEncoding("base64");

  const files = collectFilesForJob(job);

  for (const file of files) {
    hasher.update(file, "utf-8");
  }

  return hasher.digest("base64");
}

function collectFilesForJob(job: Job): string[] {
  const jobFiles = globSync(job.include ? job.include : "**", {
    cwd: job.path,
    nodir: true,
    absolute: true,
    follow: true,
    ignore: [
      "node_modules/**/*",
      "dist/**/*",
      "app/**/*",
      "lib/**/*",
      "test-results/**/*",
      ...(job.exclude ?? []),
    ],
  }).map((filePath) => fs.readFileSync(filePath, { encoding: "utf-8" }));
  const dependencyHashes = collectDependencyHashes(job);

  return [...jobFiles, ...dependencyHashes];
}

function collectDependencyHashes(job: Job): string[] {
  const hashes: string[] = [];

  for (const dependency of job.dependencies) {
    const meta = JSON.parse(
      fs.readFileSync(
        path.join(dependency.path, `.buildsystem/${dependency.job}.json`),
        { encoding: "utf-8" }
      )
    );
    hashes.push(meta.hash);
  }

  return hashes;
}
