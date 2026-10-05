import { routeAgentRequest } from "agents";
import { ScannerAgent } from "./worker/scanner-agent";
import type { Env } from "./types/env";

export { ScannerAgent };

export default {
  fetch: async (request: Request, env: Env): Promise<Response> => {
    const response = await routeAgentRequest(request, env);

    return response ?? new Response("Not found", { status: 404 });
  },
};
