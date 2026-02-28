/**
 * MCP 相关类型定义
 * 参考 openwork packages/app/src/app/types.ts
 */

export type McpServerType = 'remote' | 'local';

export interface McpServerConfig {
  type: McpServerType;
  url?: string;
  command?: string[];
  enabled?: boolean;
  headers?: Record<string, string>;
  environment?: Record<string, string>;
  oauth?: Record<string, unknown> | false;
  timeout?: number;
}

export interface McpServerEntry {
  name: string;
  config: McpServerConfig;
}

export interface McpItem {
  name: string;
  config: McpServerConfig;
  source: 'config.global' | 'config.project';
  disabledByTools?: boolean;
}

export type McpStatus =
  | { status: 'connected' }
  | { status: 'disabled' }
  | { status: 'failed'; error: string }
  | { status: 'needs_auth' }
  | { status: 'needs_client_registration'; error: string };

export type McpStatusMap = Record<string, McpStatus>;
