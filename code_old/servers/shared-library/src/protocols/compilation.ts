import z from "zod";
import { MessagingProtocol } from "messaging-channels";
import { DirectorySchema } from "../types/compilation.js";

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
