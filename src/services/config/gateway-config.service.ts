import type { Result } from "../../types/index.js";
import { validatePort } from "../../shared/validators.js";
import { ConfigRepository } from "./config.repository.js";

export class GatewayConfigService {
  constructor(private readonly repository: ConfigRepository) {}

  getPort(): number {
    return this.repository.getConfig().port;
  }

  setPort(port: number): Result {
    const validation = validatePort(port);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    this.repository.updateConfig((config) => {
      config.port = port;
    });

    return { success: true };
  }
}
