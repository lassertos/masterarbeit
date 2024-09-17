import path from "path";
import fs from "fs";
import { Job } from "../../types.mjs";

export function revertPackageLock(job: Job) {
  const packageJsonPath = path.join(job.path, "package.json");
  const packageLockJsonPath = path.join(job.path, "package-lock.json");
  const packageJsonBackupPath = `${packageJsonPath}.bak`;
  const packageLockJsonBackupPath = `${packageLockJsonPath}.bak`;

  fs.renameSync(packageJsonBackupPath, packageJsonPath);
  fs.renameSync(packageLockJsonBackupPath, packageLockJsonPath);
}
