import z from "zod";
import { MessagingProtocol } from "messaging-channels";

// declare File type + typeguard
export const FileSchema = z.object({
  type: z.literal("file"),
  name: z.string(),
  content: z.string(),
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
    content: z.lazy(() => DirectorySchema.array()),
  }
);
export function isDirectory(data: unknown): data is Directory {
  return DirectorySchema.safeParse(data).success;
}

type CompilationProtocolMessageType =
  | "compilation:request"
  | "compilation:response";
type CompilationProtocolRole = "client" | "server";

export const compilationProtocol = {
  messageTypes: ["compilation:request", "compilation:response"],
  messages: {
    "compilation:request": z.object({
      directory: DirectorySchema,
    }),
    "compilation:response": z.object({
      success: z.boolean(),
      message: z.string(),
    }),
  },
  roles: ["client", "server"],
  roleMessages: {
    client: {
      incoming: ["compilation:response"],
      outgoing: ["compilation:request"],
    },
    server: {
      incoming: ["compilation:request"],
      outgoing: ["compilation:response"],
    },
  },
} as const satisfies MessagingProtocol<
  CompilationProtocolMessageType,
  CompilationProtocolRole
>;

export type CompilationProtocol = typeof compilationProtocol;
