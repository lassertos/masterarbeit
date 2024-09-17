import path from "path";
import { Job } from "../types.mjs";
import fs from "fs";
import { execSync } from "child_process";

function resolveLocalDependencies(
  projectPath: string
): { name: string; path: string }[] {
  const packageJsonPath = path.join(projectPath, "package.json");

  if (!fs.existsSync(packageJsonPath)) {
    throw new Error(
      `Could not find file "package.json" in path "${projectPath}"`
    );
  }

  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, { encoding: "utf-8" })
  );
  const dependencies = packageJson.dependencies;

  if (!dependencies) {
    return [];
  }

  const localDependencies = Object.entries(dependencies)
    .filter(
      (entry) => typeof entry[1] === "string" && entry[1].startsWith("file:")
    )
    .map((entry) => {
      if (typeof entry[1] !== "string") {
        throw new Error(
          `Expected value to be of type "string" instead got type "${typeof entry[1]}"`
        );
      }
      return {
        name: entry[0],
        path: path.resolve(projectPath, entry[1].slice(5)),
      };
    });

  return [
    ...localDependencies,
    ...localDependencies.flatMap((localDependency) =>
      resolveLocalDependencies(localDependency.path)
    ),
  ].filter(
    (value, index, array) =>
      array.findIndex((entry) => entry.name === value.name) === index
  );
}

export function packageLocalDependencies(job: Job) {
  const packagesPath = path.join(job.path, ".packages");

  const localDependencies = resolveLocalDependencies(job.path);

  if (localDependencies.length === 0) {
    return;
  }

  fs.rmSync(packagesPath, { force: true, recursive: true });
  fs.mkdirSync(packagesPath);

  for (const localDependency of localDependencies) {
    const packageJsonPath = path.join(localDependency.path, "package.json");
    const packageJson = JSON.parse(
      fs.readFileSync(packageJsonPath, { encoding: "utf-8" })
    );

    const version = packageJson.version;

    const packageName = `${localDependency.name
      .replace("@", "")
      .replaceAll("/", "-")}-${version}.tgz`;
    const packagePath = path.join(
      localDependency.path,
      `.buildsystem/${packageName}`
    );

    if (!fs.existsSync(packagePath)) {
      execSync("npm pack --pack-destination=.buildsystem", {
        cwd: localDependency.path,
        stdio: "pipe",
      });
    }

    fs.copyFileSync(packagePath, path.join(packagesPath, `${packageName}`));
  }
}
