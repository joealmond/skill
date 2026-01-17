#!/usr/bin/env node
/**
 * Doc-Architect MCP Server
 * 
 * Self-healing documentation engine providing tools for:
 * - Semantic codebase indexing
 * - Documentation search
 * - Staleness detection
 * - Autonomous task processing
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { toolDefinitions, handleToolCall } from './tools/index.js';

// Get workspace path from environment
const workspacePath = process.env.WORKSPACE_PATH || process.cwd();

const server = new Server(
  { name: 'doc-architect', version: '0.1.0' },
  { capabilities: { tools: {} } }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools: toolDefinitions };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  return handleToolCall(name, args ?? {}, workspacePath);
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Doc-Architect MCP server running on stdio');
  console.error(`Workspace: ${workspacePath}`);
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});
