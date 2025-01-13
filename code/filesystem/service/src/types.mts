import { DirectorySchema, FileSchema } from "@crosslab-ide/filesystem-schemas";
import { z } from "zod";

const TemplatesArraySchema = z.array(
  z.object({
    id: z.string(),
    name: z.string(),
    content: z.union([DirectorySchema, FileSchema]),
  })
);

export type TemplatesArray = z.infer<typeof TemplatesArraySchema>;
export function isTemplatesArray(input: unknown): input is TemplatesArray {
  return TemplatesArraySchema.safeParse(input).success;
}
