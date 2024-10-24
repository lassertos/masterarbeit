import { ResultFormatsDescriptor } from "@crosslab-ide/compilation-messaging-protocol";

const arduinoCliFormatNames = [
  "elf",
  "hex",
  "elf with bootloader",
  "hex with bootloader",
  "build directory",
] as const;

export const arduinoCliResultFormatsDescription = {
  formatNames: arduinoCliFormatNames,
  formats: {
    elf: {
      description: "Returns only the compiled elf file.",
      result: {
        type: "file",
        name: "sketch.ino.elf",
        description: "The compiled elf file.",
      },
    },
    hex: {
      description: "Returns only the compiled hex file.",
      result: {
        type: "file",
        name: "sketch.ino.hex",
        description: "The compiled hex file.",
      },
    },
    "elf with bootloader": {
      description:
        "Returns only the compiled elf file with the arduino bootloader.",
      result: {
        type: "file",
        name: "sketch.ino.bootloader.elf",
        description: "The compiled elf file with the arduino bootloader.",
      },
    },
    "hex with bootloader": {
      description:
        "Returns only the compiled hex file with the arduino bootloader.",
      result: {
        type: "file",
        name: "sketch.ino.bootloader.hex",
        description: "The compiled hex file with the arduino bootloader.",
      },
    },
    "build directory": {
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
          "sketch.ino.bootloader.elf": {
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
  },
} as const satisfies ResultFormatsDescriptor<typeof arduinoCliFormatNames>;

export type ArduinoCliResultFormatsDescription =
  typeof arduinoCliResultFormatsDescription;
