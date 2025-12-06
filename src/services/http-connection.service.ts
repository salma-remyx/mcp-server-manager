/**
 * HTTP Connection Service - Native HTTP client for MCP clients
 *
 * Provides a native alternative to supergateway by creating an HTTP client
 * that connects to the mcpsm gateway and serves via STDIO to MCP clients.
 */

import { spawn, ChildProcess } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createLogger } from "../shared/logger.js";
import { getSettingsService } from "./settings.service.js";

const logger = createLogger("HttpConnectionService");
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const packageRoot = path.resolve(__dirname, "..", "..");

interface HttpConnection {
  id: string;
  process: ChildProcess;
  port: number;
  host: string;
}

class HttpConnectionService {
  private connections = new Map<string, HttpConnection>();

  /**
   * Create a new HTTP client bridge process
   */
  async createConnection(options?: {
    port?: number;
    host?: string;
    silent?: boolean;
  }): Promise<{ success: boolean; connectionId?: string; error?: string }> {
    const settingsService = getSettingsService();
    const port = options?.port || settingsService.get("port");
    const host = options?.host || "localhost";

    if (!options?.silent) {
      logger.info(`Creating HTTP connection to ${host}:${port}`);
    }

    try {
      // Create the bridge process
      const connectionId = `http-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Spawn Node.js process with in-memory bridge code
      const child = this.startBridgeProcess(port, host);

      // Set up error handling
      child.on("error", (error) => {
        if (!options?.silent) {
          logger.error(`HTTP connection ${connectionId} error:`, error);
        }
        this.connections.delete(connectionId);
      });

      child.on("exit", (code) => {
        if (!options?.silent) {
          logger.info(`HTTP connection ${connectionId} exited with code ${code}`);
        }
        this.connections.delete(connectionId);
      });

      // Store connection
      this.connections.set(connectionId, {
        id: connectionId,
        process: child,
        port,
        host,
      });

      if (!options?.silent) {
        logger.info(`Created HTTP connection ${connectionId} to ${host}:${port}`);
      }
      return { success: true, connectionId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (!options?.silent) {
        logger.error(`Failed to create HTTP connection: ${errorMessage}`);
      }
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Close a specific connection
   */
  async closeConnection(connectionId: string, silent = false): Promise<void> {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      if (!silent) {
        logger.warn(`Connection ${connectionId} not found`);
      }
      return;
    }

    if (!silent) {
      logger.info(`Closing HTTP connection ${connectionId}`);
    }
    connection.process.kill("SIGTERM");
    this.connections.delete(connectionId);
  }

  /**
   * Close all connections
   */
  async closeAllConnections(silent = false): Promise<void> {
    if (!silent) {
      logger.info(`Closing all HTTP connections (${this.connections.size})`);
    }

    const promises = Array.from(this.connections.entries()).map(([id, _connection]) =>
      this.closeConnection(id, silent)
    );

    await Promise.allSettled(promises);
  }

  /**
   * Get all active connections
   */
  getConnections(): HttpConnection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Start bridge process with hardcoded bridge logic
   */
  private startBridgeProcess(port: number, host: string): ChildProcess {
    const bridgePath = path.join(packageRoot, "dist", "bridge", "http-bridge.js");
    if (!fs.existsSync(bridgePath)) {
      throw new Error(`Bridge entry not found at ${bridgePath}. Run bun run build:bridge.`);
    }

    return spawn(process.execPath, [bridgePath], {
      stdio: ["inherit", "inherit", "inherit"],
      cwd: packageRoot,
      env: {
        ...process.env,
        MCP_GATEWAY_HOST: host,
        MCP_GATEWAY_PORT: port.toString(),
      },
    });
  }
}

// Singleton instance
let httpConnectionService: HttpConnectionService | null = null;

export function getHttpConnectionService(): HttpConnectionService {
  if (!httpConnectionService) {
    httpConnectionService = new HttpConnectionService();
  }
  return httpConnectionService;
}
