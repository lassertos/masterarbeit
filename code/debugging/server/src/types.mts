import { ResultFormat } from "../../../compilation/libraries/compilation-messaging-protocol/dist/index.mjs";

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
