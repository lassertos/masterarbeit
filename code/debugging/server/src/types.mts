import { ChildProcessWithoutNullStreams } from "child_process";
import { ResultFormat } from "@crosslab-ide/crosslab-compilation-service";
import { DebugAdapterProtocolHandler } from "./debugAdapterProtocolHandler.mjs";

export const resultFormats = [
  {
    id: "elf",
    description: "The compiled program as an elf file.",
    result: {
      type: "file",
      name: "sketch.ino.elf",
      description: "The compiled elf file.",
    },
  },
] as const satisfies ResultFormat[];

export type Session = {
  paths: {
    tmpDir: string;
    srcDir: string;
    projectDir: string;
    elfDir: string;
    elfFile: string;
  };
  gdbProcess: ChildProcessWithoutNullStreams;
  buffer: string;
  configuration?: Record<string, unknown>;
  debugAdapterProtocolHandler: DebugAdapterProtocolHandler;
};
