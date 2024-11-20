import { z } from "zod";

const fileWithoutNameSchema = z.object({
  type: z.literal("file"),
  content: z.string(),
});
export type FileWithoutName = z.infer<typeof fileWithoutNameSchema>;
export function isFileWithoutName(input: unknown): input is FileWithoutName {
  return fileWithoutNameSchema.safeParse(input).success;
}

const fileSchema = z.object({
  type: z.literal("file"),
  name: z.string(),
  content: z.string(),
});
export type File = z.infer<typeof fileSchema>;
export function isFile(input: unknown): input is File {
  return fileSchema.safeParse(input).success;
}

const directoryWithoutNameBaseSchema = z.object({
  type: z.literal("directory"),
});
export type DirectoryWithoutName = {
  type: "directory";
  content: Record<string, DirectoryWithoutName | FileWithoutName>;
};
const directoryWithoutNameSchema: z.Schema<DirectoryWithoutName> =
  directoryWithoutNameBaseSchema.extend({
    content: z.lazy(() =>
      z.record(z.union([directoryWithoutNameSchema, fileWithoutNameSchema]))
    ),
  });
export function isDirectoryWithoutName(
  input: unknown
): input is DirectoryWithoutName {
  return directoryWithoutNameSchema.safeParse(input).success;
}

export type Directory = {
  type: "directory";
  name: string;
  content: Record<string, DirectoryWithoutName | FileWithoutName>;
};
const directorySchema: z.Schema<Directory> =
  directoryWithoutNameBaseSchema.extend({
    name: z.string(),
    content: z.lazy(() =>
      z.record(z.union([directoryWithoutNameSchema, fileWithoutNameSchema]))
    ),
  });
export function isDirectory(input: unknown): input is Directory {
  return directorySchema.safeParse(input).success;
}
