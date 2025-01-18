import {} from "@crosslab-ide/filesystem-schemas";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";

const TemplateFileWithoutNameSchema = z.object({
  type: z.literal("file"),
  content: z.string(),
});
export type TemplateFileWithoutName = z.infer<
  typeof TemplateFileWithoutNameSchema
>;
const TemplateDirectoryWithoutNameBaseSchema = z.object({
  type: z.literal("directory"),
});
export type TemplateDirectoryWithoutName = z.infer<
  typeof TemplateDirectoryWithoutNameBaseSchema
> & {
  content: Record<
    string,
    TemplateFileWithoutName | TemplateDirectoryWithoutName
  >;
};
const TemplateDirectoryWithoutNameSchema: z.Schema<TemplateDirectoryWithoutName> =
  TemplateDirectoryWithoutNameBaseSchema.extend({
    content: z.lazy(() =>
      z.record(
        z.union([
          TemplateDirectoryWithoutNameSchema,
          TemplateFileWithoutNameSchema,
        ])
      )
    ),
  });
const TemplateSchema = z.object({
  name: z.string(),
  content: z.record(
    z.union([TemplateDirectoryWithoutNameSchema, TemplateFileWithoutNameSchema])
  ),
});
type Template = z.infer<typeof TemplateSchema>;
export function isTemplate(input: unknown): input is Template {
  return TemplateSchema.safeParse(input).success;
}

export class TemplateManager {
  private _templates: Map<string, Template> = new Map();
  private _variables: Map<string, string | (() => string)> = new Map();

  registerTemplateVariable(
    variableName: string,
    variableValue: string | (() => string)
  ) {
    this._variables.set(variableName, variableValue);
  }

  registerTemplate(template: Template) {
    this._templates.set(uuidv4(), template);
  }

  getTemplatesInfo(): { id: string; name: string }[] {
    return Array.from(this._templates.entries()).map(([id, template]) => {
      return { id, name: template.name };
    });
  }

  loadTemplate(id: string): Template {
    const template = this._templates.get(id);

    if (!template) {
      throw new Error(`Could not find template with id "${id}"!`);
    }

    const clonedTemplate = structuredClone(template);

    for (const [variableName, variableValue] of this._variables) {
      clonedTemplate.name = clonedTemplate.name.replaceAll(
        `{{${variableName}}}`,
        typeof variableValue === "string" ? variableValue : variableValue()
      );
    }

    const newContent: Template["content"] = {};
    for (const [entryName, entry] of Object.entries(template.content)) {
      const updatedEntryData = this._updateEntry(entryName, entry);
      newContent[updatedEntryData.entryName] = updatedEntryData.entry;
    }
    clonedTemplate.content = newContent;

    return clonedTemplate;
  }

  private _updateEntry(
    entryName: string,
    entry: TemplateDirectoryWithoutName | TemplateFileWithoutName
  ): {
    entryName: string;
    entry: TemplateDirectoryWithoutName | TemplateFileWithoutName;
  } {
    let updatedEntryName = entryName;
    for (const [variableName, variableValue] of this._variables) {
      updatedEntryName = updatedEntryName.replaceAll(
        `{{${variableName}}}`,
        typeof variableValue === "string" ? variableValue : variableValue()
      );
    }

    if (entry.type === "file") {
      let text = entry.content;
      for (const [variableName, variableValue] of this._variables) {
        text = text.replaceAll(
          `{{${variableName}}}`,
          typeof variableValue === "string" ? variableValue : variableValue()
        );
      }

      return {
        entryName: updatedEntryName,
        entry: {
          type: "file",
          content: text,
        },
      };
    }

    const newContent: Template["content"] = {};
    for (const [directoryEntryName, directoryEntry] of Object.entries(
      entry.content
    )) {
      const updatedEntryData = this._updateEntry(
        directoryEntryName,
        directoryEntry
      );
      newContent[updatedEntryData.entryName] = updatedEntryData.entry;
    }

    return {
      entryName: updatedEntryName,
      entry: {
        type: "directory",
        content: newContent,
      },
    };
  }
}
