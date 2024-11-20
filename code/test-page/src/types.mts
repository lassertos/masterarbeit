import z from "zod";

const inviteInitSchema = z.object({
  experiment: z.string(),
  devices: z.array(
    z.object({
      device: z.string(),
      role: z.union([
        z.strictObject({ existing: z.string() }),
        z.strictObject({ basedOn: z.string() }),
      ]),
    })
  ),
});
export type InviteInit = z.infer<typeof inviteInitSchema>;
export function isInviteInit(input: unknown): input is InviteInit {
  return inviteInitSchema.safeParse(input).success;
}
