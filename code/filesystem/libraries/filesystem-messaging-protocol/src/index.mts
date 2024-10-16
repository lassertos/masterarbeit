import { MessagingProtocol } from "@crosslab-ide/abstract-messaging-channel";
import { z } from "zod";

// declare File type + typeguard
export const FileSchema = z.object({
  type: z.literal("file"),
  name: z.string(),
  content: z.instanceof(Uint8Array),
});
export type File = z.infer<typeof FileSchema>;
export function isFile(data: unknown): data is File {
  return FileSchema.safeParse(data).success;
}

// declare Directory type + typeguard
const DirectoryBaseSchema = z.object({
  type: z.literal("directory"),
  name: z.string(),
});
export type Directory = z.infer<typeof DirectoryBaseSchema> & {
  content: (File | Directory)[];
};
export const DirectorySchema: z.ZodType<Directory> = DirectoryBaseSchema.extend(
  {
    content: z.lazy(() => z.array(z.union([DirectorySchema, FileSchema]))),
  }
);
export function isDirectory(data: unknown): data is Directory {
  return DirectorySchema.safeParse(data).success;
}

type FileSystemProtocolMessageType =
  | "createDirectory:request"
  | "createDirectory:response"
  | "delete:request"
  | "delete:response"
  | "move:request"
  | "move:response"
  | "readDirectory:request"
  | "readDirectory:response"
  | "readFile:request"
  | "readFile:response"
  | "unwatch:request"
  | "unwatch:response"
  | "watch:request"
  | "watch:response"
  | "watch-event"
  | "writeFile:request"
  | "writeFile:response";
type FileSystemProtocolRole = "producer" | "consumer";

export const fileSystemProtocol = {
  messageTypes: [
    "createDirectory:request",
    "createDirectory:response",
    "delete:request",
    "delete:response",
    "move:request",
    "move:response",
    "readDirectory:request",
    "readDirectory:response",
    "readFile:request",
    "readFile:response",
    "unwatch:request",
    "unwatch:response",
    "watch:request",
    "watch:response",
    "watch-event",
    "writeFile:request",
    "writeFile:response",
  ],
  messages: {
    "createDirectory:request": z.object({
      requestId: z.string(),
      path: z.string(),
      content: z.optional(z.array(z.union([DirectorySchema, FileSchema]))),
    }),
    "createDirectory:response": z.union([
      z.object({
        requestId: z.string(),
        success: z.literal(true),
      }),
      z.object({
        requestId: z.string(),
        success: z.literal(false),
        message: z.optional(z.string()),
      }),
    ]),
    "delete:request": z.object({
      requestId: z.string(),
      path: z.string(),
    }),
    "delete:response": z.union([
      z.object({
        requestId: z.string(),
        success: z.literal(true),
      }),
      z.object({
        requestId: z.string(),
        success: z.literal(false),
        message: z.optional(z.string()),
      }),
    ]),
    "move:request": z.object({
      requestId: z.string(),
      path: z.string(),
      newPath: z.string(),
    }),
    "move:response": z.union([
      z.object({
        requestId: z.string(),
        success: z.literal(true),
      }),
      z.object({
        requestId: z.string(),
        success: z.literal(false),
        message: z.optional(z.string()),
      }),
    ]),
    "readDirectory:request": z.object({
      requestId: z.string(),
      path: z.string(),
    }),
    "readDirectory:response": z.union([
      z.object({
        requestId: z.string(),
        success: z.literal(true),
        directory: DirectorySchema,
      }),
      z.object({
        requestId: z.string(),
        success: z.literal(false),
        message: z.optional(z.string()),
      }),
    ]),
    "readFile:request": z.object({
      requestId: z.string(),
      path: z.string(),
    }),
    "readFile:response": z.union([
      z.object({
        requestId: z.string(),
        success: z.literal(true),
        file: FileSchema,
      }),
      z.object({
        requestId: z.string(),
        success: z.literal(false),
        message: z.optional(z.string()),
      }),
    ]),
    "unwatch:request": z.object({
      requestId: z.string(),
      watcherId: z.string(),
    }),
    "unwatch:response": z.union([
      z.object({
        requestId: z.string(),
        success: z.literal(true),
      }),
      z.object({
        requestId: z.string(),
        success: z.literal(false),
        message: z.optional(z.string()),
      }),
    ]),
    "watch:request": z.object({
      requestId: z.string(),
      path: z.optional(z.string()),
    }),
    "watch:response": z.union([
      z.object({
        requestId: z.string(),
        success: z.literal(true),
        watcherId: z.string(),
      }),
      z.object({
        requestId: z.string(),
        success: z.literal(false),
        message: z.optional(z.string()),
      }),
    ]),
    "watch-event": z.union([
      z.object({
        watcherId: z.string(),
        type: z.literal("changed"),
        path: z.string(),
        newContent: z.union([
          z.instanceof(Uint8Array),
          z.array(z.union([DirectorySchema, FileSchema])),
        ]),
      }),
      z.object({
        watcherId: z.string(),
        type: z.literal("moved"),
        oldPath: z.string(),
        newPath: z.string(),
      }),
      z.object({
        watcherId: z.string(),
        type: z.literal("created"),
        path: z.string(),
        entry: z.union([DirectorySchema, FileSchema]),
      }),
      z.object({
        watcherId: z.string(),
        type: z.literal("deleted"),
        path: z.string(),
      }),
    ]),
    "writeFile:request": z.object({
      requestId: z.string(),
      path: z.string(),
      content: z.string(),
    }),
    "writeFile:response": z.union([
      z.object({
        requestId: z.string(),
        success: z.literal(true),
      }),
      z.object({
        requestId: z.string(),
        success: z.literal(false),
        message: z.optional(z.string()),
      }),
    ]),
  },
  roles: ["consumer", "producer"],
  roleMessages: {
    consumer: {
      incoming: [
        "createDirectory:response",
        "delete:response",
        "move:response",
        "readDirectory:response",
        "readFile:response",
        "unwatch:response",
        "watch:response",
        "watch-event",
        "writeFile:response",
      ],
      outgoing: [
        "createDirectory:request",
        "delete:request",
        "move:request",
        "readDirectory:request",
        "readFile:request",
        "unwatch:request",
        "watch:request",
        "writeFile:request",
      ],
    },
    producer: {
      incoming: [
        "createDirectory:request",
        "delete:request",
        "move:request",
        "readDirectory:request",
        "readFile:request",
        "unwatch:request",
        "watch:request",
        "writeFile:request",
      ],
      outgoing: [
        "createDirectory:response",
        "delete:response",
        "move:response",
        "readDirectory:response",
        "readFile:response",
        "unwatch:response",
        "watch:response",
        "watch-event",
        "writeFile:response",
      ],
    },
  },
} as const satisfies MessagingProtocol<
  FileSystemProtocolMessageType,
  FileSystemProtocolRole
>;

export type FileSystemProtocol = typeof fileSystemProtocol;
