const addon = require("bindings")("addon");

export interface Simulation {
  load(elfFilePath: string): void;
  start(): void;
  stop(): void;
  setPinValue(pin: string, value: number): void;
  getPinValue(pin: string): number;
  listPins(): string[];
  registerPinCallback(pin: string, callback: (value: number) => void): void;
  readonly status: "created" | "programmed" | "running" | "stopped";
}

export const Simulation: {
  new (core: string): Simulation;
} = addon.Simulation;
export const listCores: () => string[] = addon.listCores;
