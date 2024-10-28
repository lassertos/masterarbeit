import { IncomingMessage } from "@crosslab-ide/abstract-messaging-channel";
import { z } from "zod";

// declare schemas and types for files without a name

const FileWithoutNameSchema = z.object({
  type: z.literal("file"),
  content: z.instanceof(Uint8Array),
});
type FileWithoutName = z.infer<typeof FileWithoutNameSchema>;

// declare schemas and types for files with a name

const FileSchema = FileWithoutNameSchema.extend({
  name: z.string(),
});
type File = z.infer<typeof FileSchema>;

// declare schemas and types for file result formats without a name

const FileResultFormatWithoutNameSchema = FileWithoutNameSchema.omit({
  content: true,
}).extend({
  description: z.optional(z.string()),
});
type FileResultFormatWithoutName = z.infer<
  typeof FileResultFormatWithoutNameSchema
>;

// declare schemas and types for file result formats without a name

const FileResultFormatSchema = FileSchema.omit({ content: true }).extend({
  description: z.optional(z.string()),
});
type FileResultFormat = z.infer<typeof FileResultFormatSchema>;

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

const DirectorySchema = z.object({
  type: z.literal("directory"),
  name: z.string(),
  content: z.record(
    z.union([DirectoryWithoutNameSchema, FileWithoutNameSchema])
  ),
});
export type Directory = z.infer<typeof DirectorySchema>;

// declare schemas and types for directory result formats without a name

const DirectoryResultFormatWithoutNameBaseSchema =
  DirectoryWithoutNameBaseSchema.extend({
    description: z.optional(z.string()),
  });
type DirectoryResultFormatWithoutName = z.infer<
  typeof DirectoryResultFormatWithoutNameBaseSchema
> & {
  content: Record<
    string,
    FileResultFormatWithoutName | DirectoryResultFormatWithoutName
  >;
};
const DirectoryResultFormatWithoutNameSchema: z.Schema<DirectoryResultFormatWithoutName> =
  DirectoryResultFormatWithoutNameBaseSchema.extend({
    content: z.lazy(() =>
      z.record(
        z.union([
          DirectoryResultFormatWithoutNameSchema,
          FileResultFormatWithoutNameSchema,
        ])
      )
    ),
  });

// declare schemas and types for directory result formats with a name

const DirectoryResultFormatSchema = DirectorySchema.omit({
  content: true,
}).extend({
  description: z.optional(z.string()),
  content: z.record(
    z.union([
      DirectoryResultFormatWithoutNameSchema,
      FileResultFormatWithoutNameSchema,
    ])
  ),
});
type DirectoryResultFormat = z.infer<typeof DirectoryResultFormatSchema>;

// declare types for result formats

type ResultFormatArrayId<R extends ResultFormat[]> = R extends [
  infer Head extends ResultFormat,
  ...infer Tail extends ResultFormat[]
]
  ? Head["id"] | ResultFormatArrayId<Tail>
  : never;

type ResultFormat = {
  id: string;
  description: string;
  result: FileResultFormat | DirectoryResultFormat;
};

type FormattedResult<R extends ResultFormats[], K extends keyof R> = {
  type: R[K]["result"]["type"];
  name: R[K]["result"]["name"];
  content: R[K]["result"] extends DirectoryResultFormat
    ? FormattedDirectoryResultContent<R[K]["result"]>
    : Uint8Array;
};

type FormattedDirectoryResultContent<
  D extends Omit<DirectoryResultFormat, "name">
> = {
  [k in keyof D["content"]]: D["content"][k] extends Omit<
    DirectoryResultFormat,
    "name"
  >
    ? {
        type: "directory";
        content: FormattedDirectoryResultContent<D["content"][k]>;
      }
    : {
        type: "file";
        content: Uint8Array;
      };
};

type FormattedResponse<
  R extends ResultFormatsDescriptor,
  U = keyof R extends string ? ToTuple<keyof R> : undefined
> = U extends undefined
  ? {
      requestId: string;
      success: true;
      message?: string;
      format?: string;
      result: File | Directory;
    }
  : U extends readonly [infer Head, ...infer Tail]
  ? Head extends keyof R
    ?
        | {
            requestId: string;
            success: true;
            message?: string;
            format: Head;
            result: FormattedResult<R, Head>;
          }
        | (Tail extends readonly string[] ? FormattedResponse<R, Tail> : never)
    : never
  : never;

function test<R extends ResultFormatsDescriptor>(
  message: IncomingMessage<CompilationProtocol<R>, "client">
) {
  const test: ToTuple<keyof R> extends string[] ? true : false = true;
}

function buildDirectoryContentSchema(
  directory: DirectoryResultFormatWithoutName
): z.Schema {
  return z.object(
    Object.fromEntries(
      Object.entries(directory.content).map(([key, value]) => {
        return [
          key,
          value.type === "file"
            ? z.object({
                type: z.literal("file"),
                content: z.instanceof(Uint8Array),
              })
            : z.object({
                type: z.literal("directory"),
                content: buildDirectoryContentSchema(value),
              }),
        ];
      })
    )
  );
}

function buildResultSchemaFromResultFormat<
  R extends ResultFormatsDescriptor,
  K extends keyof R
>(resultFormatsDescriptor: R, formatName: K): z.Schema<FormattedResult<R, K>> {
  return z.object({
    type: z.literal(
      resultFormatsDescriptor[formatName].result.type
    ) as z.ZodType<FormattedResult<R, K>["type"]>,
    name: z.literal(
      resultFormatsDescriptor[formatName].result.name
    ) as z.ZodType<FormattedResult<R, K>["name"]>,
    content:
      resultFormatsDescriptor[formatName].result.type === "file"
        ? (z.instanceof(Uint8Array) as z.ZodType<
            FormattedResult<R, K>["content"]
          >)
        : (buildDirectoryContentSchema(
            resultFormatsDescriptor[formatName].result
          ) as z.ZodType<FormattedResult<R, K>["content"]>),
  }) as unknown as z.Schema<FormattedResult<R, K>>;
}

function buildResponseSchemaFromResultFormat<R extends ResultFormatsDescriptor>(
  resultFormatsDescriptor: R,
  formatName: keyof R
): z.Schema<FormattedResponse<R>> {
  return z.object({
    requestId: z.string(),
    success: z.literal(true),
    message: z.optional(z.string()),
    format: z.literal(formatName),
    result: buildResultSchemaFromResultFormat(
      resultFormatsDescriptor,
      formatName
    ),
  }) as unknown as z.Schema<FormattedResponse<R>>;
}

// declare type for compilation protocol

export type CompilationProtocol<R extends ResultFormatsDescriptor = {}> = {
  messageTypes: ["compilation:request", "compilation:response"];
  messages: {
    "compilation:request": z.ZodType<{
      requestId: string;
      directory: Directory;
      format?: keyof R;
    }>;
    "compilation:response": z.ZodType<
      | {
          requestId: string;
          success: true;
          message?: string;
          result: File | Directory;
        }
      | {
          requestId: string;
          success: false;
          message?: string;
        }
      | FormattedResponse<R>
    >;
  };
  roles: ["client", "server"];
  roleMessages: {
    client: {
      incoming: ["compilation:response"];
      outgoing: ["compilation:request"];
    };
    server: {
      incoming: ["compilation:request"];
      outgoing: ["compilation:response"];
    };
  };
};

export function buildCompilationProtocol<
  R extends ResultFormatsDescriptor = {}
>(resultFormatsDescriptor?: R): CompilationProtocol<R> {
  const formatNames = Object.keys(resultFormatsDescriptor ?? {});
  return {
    messageTypes: ["compilation:request", "compilation:response"],
    messages: {
      "compilation:request": z.object({
        requestId: z.string(),
        directory: DirectorySchema,
        format:
          formatNames.length === 0
            ? z.optional(z.string())
            : formatNames.length === 1
            ? z.optional(z.literal(formatNames[0]))
            : z.optional(
                z.union([
                  z.literal(formatNames[0]),
                  z.literal(formatNames[1]),
                  ...formatNames
                    .slice(2)
                    .map((formatName) => z.literal(formatName)),
                ])
              ),
      }),
      "compilation:response": z.union([
        z.strictObject({
          requestId: z.string(),
          success: z.literal(true),
          message: z.optional(z.string()),
          result: z.union([FileSchema, DirectorySchema]),
        }),
        z.object({
          requestId: z.string(),
          success: z.literal(false),
          message: z.optional(z.string()),
        }),
        ...(resultFormatsDescriptor && formatNames.length > 0
          ? formatNames.map((formatName) =>
              buildResponseSchemaFromResultFormat(
                resultFormatsDescriptor,
                formatName
              )
            )
          : [
              z.object({
                requestId: z.string(),
                success: z.literal(true),
                message: z.optional(z.string()),
                format: z.optional(z.string()),
                result: z.union([FileSchema, DirectorySchema]),
              }),
            ]),
      ]),
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
  };
}
