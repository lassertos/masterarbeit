import { AbstractCompilationServer } from "abstract-compilation-server";
import { CrosslabCompilationInstance } from "./crosslabCompilationInstance.mjs";

export abstract class CrosslabCompilationServer extends AbstractCompilationServer {
  start(): void {}

  instantiate(): CrosslabCompilationInstance {
    return new CrosslabCompilationInstance();
  }
}
