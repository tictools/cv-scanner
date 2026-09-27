import { routeAgentRequest } from "agents";
import { ScannerAgent } from "./chat/scanner-agent";
import type { Env } from "./env/agent-env";

export { ScannerAgent };

export default {
  fetch: async (request: Request, env: Env): Promise<Response> => {
    const response = await routeAgentRequest(request, env);

    return response ?? new Response("Not found", { status: 404 });
  },
};
