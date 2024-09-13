import { z } from "zod";

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
    },
);
export function isDirectory(data: unknown): data is Directory {
    return DirectorySchema.safeParse(data).success;
}
