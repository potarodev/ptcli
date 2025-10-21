// ** ROUGH DRAFT
// todo list:
// - [ ] use src folder instead of ./index.ts
// - [ ] separate socket event type definitions
// - [ ] separate websocket / ptero stuff into library
// - [ ] separate cli entry point & parsing
// - [ ] allow stdin to send commands
// - [ ] setup exe build with bun (https://runspired.com/2025/01/25/npx-executables-with-bun.html ?)
// other qol maybe:
// - [ ] allow env vars instead of just cli flags

import z from "zod";
import { parseArgs } from "util";

const { values, positionals } = parseArgs({
    args: Bun.argv,
    options: {
        key: {
            type: "string",
        },
        url: {
            type: "string",
        },
        server: {
            type: "string",
        },
    },
    allowPositionals: true,
});

const { key: API_KEY, url: API_URL, server: SERVER_ID } = values;
if (!API_KEY) {
    console.log("--key not found");
    process.exit(1);
}
if (!API_URL) {
    console.log("--url not found");
    process.exit(1);
}
if (!SERVER_ID) {
    console.log("--server not found");
}

async function authWebsocket() {
    const schema = z.object({
        // object: z.literal("websocket_token"),
        data: z.object({
            token: z.string(),
            socket: z.string().startsWith("wss://").endsWith("/ws"),
        }),
    });

    const response = await fetch(`${API_URL}/api/client/servers/${SERVER_ID}/websocket`, {
        headers: {
            Authorization: `Bearer ${API_KEY}`,
            Accept: "Application/vnd.pterodactyl.v1+json",
        },
    });
    // response.body?.text().then(console.log);
    const json = await response.json();
    console.log(json);
    const data = z.parse(schema, json);
    return data.data;
}

const { token, socket: socketUrl } = await authWebsocket();
const socket = new WebSocket(socketUrl, {
    headers: {
        authorization: `Bearer ${token}`,
        origin: API_URL,
    },
});

socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ event: "auth", args: [token] }));
});

socket.addEventListener("message", (msg) => {
    const inSchema = z.union([
        z.object({
            event: z.literal("auth success"),
        }),
        z.object({
            event: z.literal("status"),
            args: z
                .array(
                    z.union([z.literal("running"), z.literal("starting"), z.literal("stopping"), z.literal("offline")])
                )
                .length(1),
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

    const json = JSON.parse(msg.data);
    const parseResult = z.safeParse(inSchema, json);
    if (!parseResult.success) {
        console.error(`Error parsing socket event: ${parseResult.error.message}`);
        return;
    }
    const data = parseResult.data;
    if (data.event == "auth success") {
        socket.send(JSON.stringify({ event: "send logs", args: [null] }));
    }
    if (data.event == "console output") {
        console.log(data.args[0]);
    }
});

socket.addEventListener("close", (e) => {
    console.log(e.reason);
});
