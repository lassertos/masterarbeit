import { createHash } from "crypto";
import fs from "fs/promises";
import { Job } from "../types.mjs";
import path from "path";

export async function hashJob(job: Job) {
  const hasher = createHash("sha1");

  const files = await collectFilesForJob(job);

  for (const file of files) {
    hasher.update(file, "utf-8");
  }

  return hasher.digest("base64");
}

async function collectFilesForJob(job: Job): Promise<string[]> {
  const jobFiles = await collectFilesForPath(job.path, job.path, {
    include: job.include,
    exclude: [
      "node_modules",
      ".buildsystem",
      ".packages",
      "test-results",
      ".vscode",
      "dist",
      "app",
      "lib",
      ".vscode-test-web",
      ...(job.exclude ?? []),
    ],
  });
  const dependencyHashes = await collectDependencyHashes(job);

  return [...jobFiles, ...dependencyHashes];
}

async function collectFilesForPath(
  basePath: string,
  currentPath: string,
  options: {
    include?: string[];
    exclude?: string[];
  }
): Promise<string[]> {
  const stat = await fs.stat(currentPath);
  const relativePath = path.relative(basePath, currentPath);

  if (options?.include && options.include.length > 0) {
    for (const include of options.include) {
      if (
        include !== relativePath &&
        !relativePath.startsWith(
          include.endsWith("/") ? include : include + "/"
        )
      ) {
        return [];
      }
    }
  }

  if (options?.exclude) {
    for (const exclude of options.exclude) {
      if (
        exclude === relativePath ||
        relativePath.startsWith(exclude.endsWith("/") ? exclude : exclude + "/")
      ) {
        return [];
      }
    }
  }

  if (stat.isFile()) {
    return [await fs.readFile(currentPath, { encoding: "utf-8" })];
  } else if (stat.isDirectory()) {
    const entries = await fs.readdir(currentPath);
    return (
      await Promise.all(
        entries.map(
          async (entry) =>
            await collectFilesForPath(
              basePath,
              path.join(currentPath, entry),
              options
            )
        )
      )
    ).flat();
  }

  return [];
}

// async function collectFilesForJob(job: Job): Promise<string[]> {
//   const jobFiles = await Promise.all(
//     (
//       await glob(
//         job.include
//           ? job.include
//           : [
//               "src/**/*",
//               "package.json",
//               "package-lock.json",
//               "Dockerfile",
//               "public/**/*",
//               "tsconfig.json",
//             ],
//         {
//           cwd: job.path,
//           nodir: true,
//           absolute: true,
//           follow: true,
//           ignore: [
//             "node_modules/**/*",
//             ".packages/**/*",
//             ".buildsystem/**/*",
//             "dist/**/*",
//             "app/**/*",
//             "lib/**/*",
//             "test-results/**/*",
//             ...(job.exclude ?? []),
//           ],
//         }
//       )
//     ).map(
//       async (filePath) => await fs.readFile(filePath, { encoding: "utf-8" })
//     )
//   );
//   const dependencyHashes = await collectDependencyHashes(job);

//   return [...jobFiles, ...dependencyHashes];
// }

async function collectDependencyHashes(job: Job): Promise<string[]> {
  return await Promise.all(
    job.dependencies.map(async (dependency) => {
      return JSON.parse(
        await fs.readFile(
          path.join(dependency.path, `.buildsystem/${dependency.job}.json`),
          { encoding: "utf-8" }
        )
      ).hash;
    })
  );
}
