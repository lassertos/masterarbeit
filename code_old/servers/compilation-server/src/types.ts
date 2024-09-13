import { z } from "zod";

// declare InstantiationRequest type + typeguard
const InstantiationRequestSchema = z.object({
    url: z.string(),
    token: z.string(),
});
export type InstantiationRequest = z.infer<typeof InstantiationRequestSchema>;
export function isInstantiationRequest(
    request: unknown,
): request is InstantiationRequest {
    return InstantiationRequestSchema.safeParse(request).success;
}
