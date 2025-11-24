/**
 * Services index - exports all service classes and getters
 */

// Config service
export { ConfigService, getConfigService, resetConfigService } from "./config.service.js";

// Settings service
export { SettingsService, getSettingsService, resetSettingsService } from "./settings.service.js";

// Profile service
export { ProfileService, getProfileService, resetProfileService } from "./profile.service.js";

// Client service
export { ClientService, getClientService, resetClientService } from "./client.service.js";

// Testing service
export { TestingService, getTestingService, resetTestingService } from "./testing.service.js";

// Daemon service
export { DaemonService, getDaemonService, resetDaemonService } from "./daemon.service.js";

// Import/Export service
export {
  ImportExportService,
  getImportExportService,
  resetImportExportService,
} from "./import-export.service.js";

// Re-export types used by services
export type {
  AppConfig,
  LocalServer,
  RemoteServer,
  Server,
  ToolFilters,
  ServerToolFilter,
  ConfigPaths,
  Settings,
  Profile,
  ProfilesConfig,
  ProfileListItem,
  ClientId,
  DetectedClient,
  ClientsState,
  SyncResult,
  ClientSyncResult,
  ServerTestResult,
  Result,
  OperationResult,
} from "../types/index.js";
