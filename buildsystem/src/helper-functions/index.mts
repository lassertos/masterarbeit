import { Job } from "../types.mjs";
import { packageLocalDependencies } from "./package-local-dependencies.mjs";

export const helperFunctions: { [k: string]: (job: Job) => void } = {
  "package-local-dependencies": packageLocalDependencies,
};
