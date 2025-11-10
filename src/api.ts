import z from "zod";
import { websocketAuthResponseSchema } from "./api-schema";

export async function authWebsocket(server: ServerContext) {
  console.log("b", server);
  const response = await server.fetch("/websocket");
  const json = await response.json();
  console.log("respon", json);
  const data = z.parse(websocketAuthResponseSchema, json);
  return data.data;
}

export type ServerContext = {
  apiKey: string;
  baseUrl: string;
  serverId: string;
  getApiPath: (endpoint: string) => string;
  fetch: (endpoint: string, init?: RequestInit) => Promise<Response>;
};

type ServerContextOptions = Pick<ServerContext, "apiKey" | "baseUrl" | "serverId">;

export function createServerContext(options: ServerContextOptions): ServerContext {
  return {
    ...options,
    getApiPath(endpoint) {
      return `${this.baseUrl}/api/client/servers/${this.serverId}${endpoint}`;
    },
    fetch(endpoint, init?) {
      // console.log("endpoint", this.getApiPath(endpoint));
      return fetch(this.getApiPath(endpoint), {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          Accept: "Application/vnd.pterodactyl.v1+json",
          ...init?.headers,
        },
      });
    },
  };
}
