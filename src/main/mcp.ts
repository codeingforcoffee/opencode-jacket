/**
 * MCP 配置逻辑 - 参考 openwork packages/server/src/mcp.ts
 * 使用全局 opencode 配置 ~/.config/opencode/opencode.jsonc
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { parse } from 'jsonc-parser';

export interface McpItem {
  name: string;
  config: Record<string, unknown>;
  source: 'config.global' | 'config.project';
  disabledByTools?: boolean;
}

function globalOpenCodeConfigPath(): string {
  const base = join(homedir(), '.config', 'opencode');
  const jsonc = join(base, 'opencode.jsonc');
  const json = join(base, 'opencode.json');
  if (existsSync(jsonc)) return jsonc;
  if (existsSync(json)) return json;
  return jsonc;
}

function getMcpConfig(config: Record<string, unknown>): Record<string, Record<string, unknown>> {
  const mcp = config.mcp;
  if (!mcp || typeof mcp !== 'object') return {};
  return mcp as Record<string, Record<string, unknown>>;
}

function readJsoncFile(filePath: string): { data: Record<string, unknown> } {
  let content = '{}';
  if (existsSync(filePath)) {
    try {
      content = readFileSync(filePath, 'utf-8');
    } catch {
      content = '{}';
    }
  }
  try {
    const data = parse(content) as Record<string, unknown>;
    return { data: data ?? {} };
  } catch {
    return { data: {} };
  }
}

function updateJsoncTopLevel(filePath: string, updates: Record<string, unknown>): void {
  const dir = join(filePath, '..');
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const { data } = readJsoncFile(filePath);
  for (const [key, value] of Object.entries(updates)) {
    data[key] = value;
  }
  const content = JSON.stringify(data, null, 2) + '\n';
  writeFileSync(filePath, content, 'utf-8');
}

function validateMcpName(name: string): void {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('MCP 名称不能为空');
  if (trimmed.startsWith('-')) throw new Error('MCP 名称不能以 "-" 开头');
  if (!/^[A-Za-z0-9_-]+$/.test(trimmed)) {
    throw new Error('MCP 名称只能包含字母、数字、下划线和连字符');
  }
}

function validateMcpConfig(config: Record<string, unknown>): void {
  const type = config.type;
  if (type !== 'remote' && type !== 'local') {
    throw new Error('MCP 配置必须指定 type 为 "remote" 或 "local"');
  }
  if (type === 'remote' && !config.url) {
    throw new Error('remote 类型 MCP 必须指定 url');
  }
  if (type === 'local' && (!config.command || !Array.isArray(config.command))) {
    throw new Error('local 类型 MCP 必须指定 command 数组');
  }
}

export async function listMcp(): Promise<McpItem[]> {
  const path = globalOpenCodeConfigPath();
  const { data: config } = readJsoncFile(path);
  const mcpMap = getMcpConfig(config);
  const items: McpItem[] = [];
  for (const [name, entry] of Object.entries(mcpMap)) {
    if (entry && typeof entry === 'object') {
      items.push({
        name,
        config: entry as Record<string, unknown>,
        source: 'config.global',
      });
    }
  }
  return items;
}

export async function addMcp(
  name: string,
  config: Record<string, unknown>
): Promise<{ action: 'added' | 'updated' }> {
  validateMcpName(name);
  validateMcpConfig(config);
  const path = globalOpenCodeConfigPath();
  const { data } = readJsoncFile(path);
  const mcpMap = getMcpConfig(data);
  const existed = Object.prototype.hasOwnProperty.call(mcpMap, name);
  mcpMap[name] = config;
  updateJsoncTopLevel(path, { mcp: mcpMap });
  return { action: existed ? 'updated' : 'added' };
}

export async function removeMcp(name: string): Promise<boolean> {
  const path = globalOpenCodeConfigPath();
  const { data } = readJsoncFile(path);
  const mcpMap = getMcpConfig(data);
  if (!Object.prototype.hasOwnProperty.call(mcpMap, name)) return false;
  delete mcpMap[name];
  updateJsoncTopLevel(path, { mcp: mcpMap });
  return true;
}
