import { z } from "zod";

const jobDescriptionSchema = z.object({
  commands: z.object({
    prepare: z.optional(z.string()),
    execute: z.string(),
  }),
  dependencies: z.optional(z.array(z.string())),
});

export type JobDescription = z.infer<typeof jobDescriptionSchema>;

export function isJobDescription(data: unknown): data is JobDescription {
  return jobDescriptionSchema.safeParse(data).success;
}

const projectDescriptionSchema = z.record(jobDescriptionSchema);

export type ProjectDescription = z.infer<typeof projectDescriptionSchema>;

export function isProjectDescription(
  data: unknown
): data is ProjectDescription {
  return projectDescriptionSchema.safeParse(data).success;
}

const projectDescriptionArraySchema = z.record(projectDescriptionSchema);

export type ProjectDescriptionArray = z.infer<
  typeof projectDescriptionArraySchema
>;

export function isProjectDescriptionArray(
  data: unknown
): data is ProjectDescriptionArray {
  return projectDescriptionArraySchema.safeParse(data).success;
}

const jobSchema = z.object({
  project: z.string(),
  name: z.string(),
  path: z.string(),
  commands: z.object({
    prepare: z.optional(z.string()),
    execute: z.string(),
  }),
  dependencies: z.array(
    z.object({
      project: z.string(),
      job: z.string(),
    })
  ),
});

export type Job = z.infer<typeof jobSchema>;

export function isJob(data: unknown): data is Job {
  return jobSchema.safeParse(data).success;
}

const projectSchema = z.object({
  name: z.string(),
  path: z.string(),
  jobs: z.array(jobSchema),
});

export type Project = z.infer<typeof projectSchema>;

export function isProject(data: unknown): data is Project {
  return projectSchema.safeParse(data).success;
}

const jobWithResolvedDependenciesBaseSchema = jobSchema.omit({
  dependencies: true,
});

export type JobWithResolvedDependencies = z.infer<
  typeof jobWithResolvedDependenciesBaseSchema
> & { dependencies: JobWithResolvedDependencies[] };

const jobWithResolvedDependenciesSchema: z.ZodType<JobWithResolvedDependencies> =
  jobWithResolvedDependenciesBaseSchema.extend({
    dependencies: z.lazy(() => jobWithResolvedDependenciesSchema.array()),
  });

export function isJobWithResolvedDependencies(
  data: unknown
): data is JobWithResolvedDependencies {
  return jobWithResolvedDependenciesSchema.safeParse(data).success;
}

export type JobStatus =
  | "waiting"
  | "running"
  | "success"
  | "failed"
  | "skipped-success"
  | "skipped-failed"
  | "dependency-failed";
