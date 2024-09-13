import { AbstractCompilationInstance } from "./abstractCompilationInstance.mjs";

export abstract class AbstractCompilationServer {
  abstract instantiate(): AbstractCompilationInstance;
  abstract start(): void;
}
