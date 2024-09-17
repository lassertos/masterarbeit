import path from "path";
import fs from "fs";
import { Job } from "../../types.mjs";
import { execSync } from "child_process";

export function updatePackageLock(job: Job) {
  const packageJsonPath = path.join(job.path, "package.json");
  const packageLockJsonPath = path.join(job.path, "package-lock.json");
  const packageJsonBackupPath = `${packageJsonPath}.bak`;
  const packageLockJsonBackupPath = `${packageLockJsonPath}.bak`;

  fs.copyFileSync(packageJsonPath, packageJsonBackupPath);
  fs.copyFileSync(packageLockJsonPath, packageLockJsonBackupPath);

  const packageJson = JSON.parse(
    fs.readFileSync(packageJsonPath, { encoding: "utf-8" })
  );

  const dependencies = packageJson.dependencies ?? {};
  const updatedDependencies: string[] = [];

  for (const dependencyName in dependencies) {
    if (!dependencies[dependencyName].startsWith("file:")) {
      continue;
    }

    const relativeDependencyPath = dependencies[dependencyName].slice(5);
    const dependencyPath = path.resolve(job.path, relativeDependencyPath);
    const dependencyPackageJsonPath = path.join(dependencyPath, "package.json");

    const dependencyPackageJson = JSON.parse(
      fs.readFileSync(dependencyPackageJsonPath, { encoding: "utf-8" })
    );

    const dependencyVersion = dependencyPackageJson.version;

    dependencies[dependencyName] = `^${dependencyVersion}`;

    updatedDependencies.push(dependencyName);
  }

  fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

  execSync(
    `npm install -f ${updatedDependencies.join(" ")} --package-lock-only`
  );
}
