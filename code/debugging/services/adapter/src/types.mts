import { z } from "zod";

// declare schemas and types for files without a name

const FileWithoutNameSchema = z.object({
  type: z.literal("file"),
  content: z.instanceof(Uint8Array),
});
type FileWithoutName = z.infer<typeof FileWithoutNameSchema>;

// declare schemas and types for files with a name

export const FileSchema = FileWithoutNameSchema.extend({
  name: z.string(),
});
export type File = z.infer<typeof FileSchema>;

// declare schemas and types for directories without a name

const DirectoryWithoutNameBaseSchema = z.object({
  type: z.literal("directory"),
});
type DirectoryWithoutName = z.infer<typeof DirectoryWithoutNameBaseSchema> & {
  content: Record<string, FileWithoutName | DirectoryWithoutName>;
};
const DirectoryWithoutNameSchema: z.Schema<DirectoryWithoutName> =
  DirectoryWithoutNameBaseSchema.extend({
    content: z.lazy(() =>
      z.record(z.union([DirectoryWithoutNameSchema, FileWithoutNameSchema]))
    ),
  });

// declare schemas and types for directories with a name

export const DirectorySchema = z.object({
  type: z.literal("directory"),
  name: z.string(),
  content: z.record(
    z.union([DirectoryWithoutNameSchema, FileWithoutNameSchema])
  ),
});
export type Directory = z.infer<typeof DirectorySchema>;
