import { DirectedGraph } from "../classes/directedGraph.mjs";
import { Job } from "../types.mjs";

export function buildDependencyGraph(
  job: Job,
  jobs: Job[]
): DirectedGraph<Job> {
  const dependencyGraph = new DirectedGraph<Job>(false);

  const jobNode = `${job.project}:${job.name}`;

  dependencyGraph.addNode(jobNode, job);

  for (const dependency of job.dependencies) {
    const dependencyJob = jobs.find(
      (j) => j.project === dependency.project && j.name === dependency.job
    );

    if (!dependencyJob) {
      throw new Error(
        `Could not find dependency "${dependency.project}:${dependency.job}" of job "${job.project}:${job.name}"!`
      );
    }

    const dg = buildDependencyGraph(dependencyJob, jobs);

    for (const node of dg.nodes) {
      dependencyGraph.addNode(node.name, node.data);
    }

    for (const edge of dg.edges) {
      dependencyGraph.addEdge(edge.from, edge.to);
    }

    dependencyGraph.addEdge(jobNode, `${dependency.project}:${dependency.job}`);
  }

  return dependencyGraph;
}
