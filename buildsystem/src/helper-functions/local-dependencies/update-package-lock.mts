import path from "path";
import fs from "fs";
import { Job } from "../../types.mjs";
import { spawn } from "child_process";

export async function updatePackageLock(job: Job) {
  const packageJsonPath = path.join(job.path, "package.json");
  const packageLockJsonPath = path.join(job.path, "package-lock.json");
  const packageJsonBackupPath = `${packageJsonPath}.bak`;
  const packageLockJsonBackupPath = `${packageLockJsonPath}.bak`;

  fs.copyFileSync(packageJsonPath, packageJsonBackupPath);
  fs.copyFileSync(packageLockJsonPath, packageLockJsonBackupPath);

  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, { encoding: "utf-8" })
  );

  if (!packageJson.version) {
    packageJson.version = "0.0.1";
  }

  const updatedDependencies: string[] = [];

  for (const key of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
    "optionalDependencies",
  ]) {
    const dependencies = packageJson[key] ?? {};

    for (const dependencyName in dependencies) {
      if (!dependencies[dependencyName].startsWith("file:")) {
        continue;
      }

      const relativeDependencyPath = dependencies[dependencyName].slice(5);
      const dependencyPath = path.resolve(job.path, relativeDependencyPath);
      const dependencyPackageJsonPath = path.join(
        dependencyPath,
        "package.json"
      );

      const dependencyPackageJson = JSON.parse(
        fs.readFileSync(dependencyPackageJsonPath, { encoding: "utf-8" })
      );

      const dependencyVersion = dependencyPackageJson.version ?? "0.0.1";

      dependencies[dependencyName] = `^${dependencyVersion}`;

      updatedDependencies.push(dependencyName);
    }
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  const updateProcess = spawn(
    "npm",
    ["install", ...updatedDependencies, "--force", "--package-lock-only"],
    { cwd: job.path }
  );

  await new Promise<void>((resolve) => {
    updateProcess.on("exit", () => {
      resolve();
    });
  });
}
