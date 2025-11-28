/**
 * DoctorScreen - System health check (ink component)
 */

import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { execSync } from "child_process";
import fs from "fs";
import { ScreenLayout } from "../components/index.js";
import { getConfigService } from "../../services/config.service.js";
import { useTheme } from "../theme/index.js";

interface DoctorScreenProps {
  onBack: () => void;
}

interface HealthCheck {
  name: string;
  status: boolean;
  info: string;
}

/** Check if a command exists */
function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/** Get command version */
function getVersion(cmd: string): string | null {
  try {
    const result = execSync(`${cmd} --version`, { encoding: "utf8" });
    return result.trim().split("\n")[0];
  } catch {
    return null;
  }
}

export function DoctorScreen({ onBack }: DoctorScreenProps): React.ReactElement {
  const { theme } = useTheme();
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Run health checks on mount
  useEffect(() => {
    const runChecks = (): void => {
      const configService = getConfigService();
      const results: HealthCheck[] = [];

      // Node.js
      const nodeVersion = process.version;
      const nodeOk = parseInt(nodeVersion.slice(1)) >= 18;
      results.push({
        name: "Node.js",
        status: nodeOk,
        info: nodeOk ? nodeVersion : `${nodeVersion} (requires >= 18.0.0)`,
      });

      // Python
      const pythonExists = commandExists("python3") || commandExists("python");
      const pythonVersion = pythonExists ? getVersion("python3") || getVersion("python") : null;
      results.push({
        name: "Python",
        status: pythonExists,
        info: pythonVersion || "not found",
      });

      // uv
      const uvExists = commandExists("uv");
      const uvVersion = uvExists ? getVersion("uv") : null;
      results.push({
        name: "uv",
        status: uvExists,
        info: uvVersion || "not found (optional)",
      });

      // uvx
      const uvxExists = commandExists("uvx");
      results.push({
        name: "uvx",
        status: uvxExists,
        info: uvxExists ? "available" : "not found (optional)",
      });

      // npm
      const npmExists = commandExists("npm");
      const npmVersion = npmExists ? getVersion("npm") : null;
      results.push({
        name: "npm",
        status: npmExists,
        info: npmVersion || "not found",
      });

      // Config directory
      const paths = configService.getPaths();
      const configExists = fs.existsSync(paths.configDir);
      results.push({
        name: "Config directory",
        status: configExists,
        info: configExists ? paths.configDir : "not created",
      });

      // Config file
      const configFileExists = fs.existsSync(paths.configPath);
      results.push({
        name: "Config file",
        status: configFileExists,
        info: configFileExists ? "exists" : "not found",
      });

      // Servers count
      const localServers = configService.getLocalServers();
      const remoteServers = configService.getRemoteServers();
      const totalServers = localServers.length + remoteServers.length;
      results.push({
        name: "Servers configured",
        status: true,
        info: `${totalServers} (${localServers.length} local, ${remoteServers.length} remote)`,
      });

      setChecks(results);
      setIsLoading(false);
    };

    runChecks();
  }, []);

  // Handle keyboard input
  useInput(() => {
    if (!isLoading) {
      onBack();
    }
  });

  if (isLoading) {
    return (
      <ScreenLayout
        title="System Health Check"
        shortcuts={[{ key: "Any", label: "Go back" }]}
      >
        <Box paddingY={1} gap={1}>
          <Text color={theme.colors.info}>
            <Spinner type="dots" />
          </Text>
          <Text>Running health checks...</Text>
        </Box>
      </ScreenLayout>
    );
  }

  const allOk = checks.every((c) => c.status || c.name.includes("uv"));

  return (
    <ScreenLayout
      title="System Health Check"
      shortcuts={[{ key: "Any", label: "Go back" }]}
      footer={
        allOk ? (
          <Text color={theme.colors.success}>✓ All checks passed!</Text>
        ) : (
          <Text color={theme.colors.warning}>⚠ Some checks failed. See above for details.</Text>
        )
      }
    >
      {checks.map((check) => (
        <Box key={check.name} gap={1} marginBottom={1}>
          <Text color={check.status ? theme.colors.success : theme.colors.warning}>{check.status ? "✓" : "✗"}</Text>
          <Text>{check.name}:</Text>
          <Text color={check.status ? theme.colors.success : theme.colors.warning}>{check.info}</Text>
        </Box>
      ))}
    </ScreenLayout>
  );
}

export default DoctorScreen;
