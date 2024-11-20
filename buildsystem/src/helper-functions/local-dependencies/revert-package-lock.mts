import path from "path";
import fs from "fs";
import { Job } from "../../types.mjs";
import { spawn } from "child_process";

export async function revertPackageLock(job: Job) {
  const packageJsonPath = path.join(job.path, "package.json");
  const packageLockJsonPath = path.join(job.path, "package-lock.json");
  const packageJsonBackupPath = `${packageJsonPath}.bak`;
  const packageLockJsonBackupPath = `${packageLockJsonPath}.bak`;

  fs.renameSync(packageJsonBackupPath, packageJsonPath);
  fs.renameSync(packageLockJsonBackupPath, packageLockJsonPath);

  const updateProcess = spawn("npm", ["install"], { cwd: job.path });

  await new Promise<void>((resolve) => {
    updateProcess.on("exit", () => {
      resolve();
    });
  });
}
