import { Job } from "../types.mjs";
import { revertPackageLock } from "./local-dependencies/revert-package-lock.mjs";
import { updatePackageLock } from "./local-dependencies/update-package-lock.mjs";

export const helperFunctions: {
  [k: string]: (job: Job) => Promise<void> | void;
} = {
  "update-package-lock": updatePackageLock,
  "revert-package-lock": revertPackageLock,
};
