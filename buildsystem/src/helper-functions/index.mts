import { Job } from "../types.mjs";
import { revertPackageLock } from "./local-dependencies/revert-package-lock.mjs";
import { updatePackageLock } from "./local-dependencies/update-package-lock.mjs";
import { packageLocalDependencies } from "./package-local-dependencies.mjs";

export const helperFunctions: { [k: string]: (job: Job) => void } = {
  "package-local-dependencies": packageLocalDependencies,
  "update-package-lock": updatePackageLock,
  "revert-package-lock": revertPackageLock,
};
