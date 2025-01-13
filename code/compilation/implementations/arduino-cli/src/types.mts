import { ResultFormat } from "@crosslab-ide/crosslab-compilation-service";

export const arduinoCliResultFormats = [
  {
    id: "elf",
    description: "Returns only the compiled elf file.",
    result: {
      type: "file",
      name: "sketch.ino.elf",
      description: "The compiled elf file.",
    },
  },
  {
    id: "hex",
    description: "Returns only the compiled hex file.",
    result: {
      type: "file",
      name: "sketch.ino.hex",
      description: "The compiled hex file.",
    },
  },
  {
    id: "bin with bootloader",
    description:
      "Returns only the compiled binary file with the arduino bootloader.",
    result: {
      type: "file",
      name: "sketch.ino.with_bootloader.bin",
      description: "The compiled binary file with the arduino bootloader.",
    },
  },
  {
    id: "hex with bootloader",
    description:
      "Returns only the compiled hex file with the arduino bootloader.",
    result: {
      type: "file",
      name: "sketch.ino.with_bootloader.hex",
      description: "The compiled hex file with the arduino bootloader.",
    },
  },
  {
    id: "build directory",
    description: "Returns the build directory containing all compiled files.",
    result: {
      type: "directory",
      name: "build",
      description: "The build directory containing all compiled files.",
      content: {
        "sketch.ino.elf": {
          type: "file",
          description: "The compiled elf file.",
        },
        "sketch.ino.hex": {
          type: "file",
          description: "The compiled hex file.",
        },
        "sketch.ino.with_bootloader.bin": {
          type: "file",
          description: "The compiled elf file with the arduino bootloader.",
        },
        "sketch.ino.bootloader.hex": {
          type: "file",
          description: "The compiled hex file with the arduino bootloader.",
        },
      },
    },
  },
] as const satisfies ResultFormat[];

export type ArduinoCliResultFormats = typeof arduinoCliResultFormats;
