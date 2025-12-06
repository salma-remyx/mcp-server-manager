import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { isJSONRPCRequest, type JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";

const host = process.env.MCP_GATEWAY_HOST || "localhost";
const port = parseInt(process.env.MCP_GATEWAY_PORT || "0", 10);

console.error("[DEBUG] Starting bridge...");
console.error("[DEBUG] Port:", port, "Host:", host);

async function startBridge(): Promise<void> {
  try {
    const gatewayUrl = new URL(`http://${host}:${port}/mcp`);
    const httpTransport = new StreamableHTTPClientTransport(gatewayUrl);
    const stdioTransport = new StdioServerTransport();

    httpTransport.onerror = (error: Error): void => {
      console.error("[DEBUG] HTTP transport error:", error.message);
      process.exit(1);
    };
    httpTransport.onclose = (): void => {
      console.error("[DEBUG] HTTP transport closed");
      process.exit(0);
    };

    stdioTransport.onerror = (error: Error): void => {
      console.error("[DEBUG] STDIO transport error:", error.message);
      process.exit(1);
    };

    console.error("[DEBUG] Connecting to gateway...");
    await httpTransport.start();
    console.error("[DEBUG] Connected!");

    stdioTransport.onmessage = async (message: JSONRPCMessage): Promise<void> => {
      try {
        if (isJSONRPCRequest(message)) {
          console.error("[DEBUG] Forwarding request:", JSON.stringify(message, null, 2));
        } else {
          console.error("[DEBUG] Forwarding message:", JSON.stringify(message, null, 2));
        }
        await httpTransport.send(message);
      } catch (err) {
        const error = err as Error;
        console.error("[DEBUG] Send error:", error.message);
        try {
          if (isJSONRPCRequest(message) && message.id !== undefined) {
            await stdioTransport.send({
              jsonrpc: "2.0",
              id: message.id,
              error: { code: -32000, message: error.message },
            });
          }
        } catch {
          // ignore secondary failures
        }
      }
    };

    httpTransport.onmessage = async (message: JSONRPCMessage): Promise<void> => {
      try {
        await stdioTransport.send(message);
      } catch (err) {
        const error = err as Error;
        console.error("[DEBUG] Write to STDIO failed:", error.message);
      }
    };

    process.on("SIGINT", () => process.exit(0));
    process.on("SIGTERM", () => process.exit(0));
  } catch (err) {
    const error = err as Error;
    console.error("Bridge failed:", error.message);
    process.exit(1);
  }
}

startBridge();
