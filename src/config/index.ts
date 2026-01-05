/**
 * Config module - exports config loading and schema types
 */
export {
  loadConfig,
  DEFAULT_CONFIG_FILENAME,
  type DiscoveryConfig,
  type ServerConfig,
  type TransportConfig,
} from "./loadConfig.js";

export {
  DiscoveryConfigSchema,
  ServerConfigSchema,
  TransportConfigSchema,
  StdioTransportConfigSchema,
  HttpTransportConfigSchema,
  type StdioTransportConfig,
  type HttpTransportConfig,
} from "./schema.js";

