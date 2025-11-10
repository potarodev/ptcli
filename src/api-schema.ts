import z from "zod";

export const websocketAuthResponseSchema = z.object({
  // object: z.literal("websocket_token"),
  data: z.object({
    token: z.string(),
    socket: z.string().startsWith("wss://").endsWith("/ws"),
  }),
});

export const websocketResponseSchema = z.union([
  z.object({
    event: z.literal("auth success"),
  }),
  z.object({
    event: z.literal("status"),
    args: z.array(z.union([z.literal("running"), z.literal("starting"), z.literal("stopping"), z.literal("offline")])).length(1),
  }),
  z.object({
    event: z.literal("stats"),
    args: z.array(z.string()).length(1), // TODO: parse with transformer
  }),
  z.object({
    event: z.literal("console output"),
    args: z.array(z.string()).length(1),
  }),
]);
