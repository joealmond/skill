#!/usr/bin/env node
/**
 * CLI wrapper for MCP tools
 * 
 * Usage:
 *   npm run tool -- <tool_name> [arg=value ...]
 * 
 * Examples:
 *   npm run tool -- list_inbox
 *   npm run tool -- complete_spec specName=feature1
 *   npm run tool -- append_changelog category=Added entry="New feature"
 */

import { toolDefinitions, handleToolCall } from './tools/index.js';

const workspacePath = process.env.WORKSPACE_PATH || process.cwd();

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log('Doc-Architect CLI Tool Runner\n');
    console.log('Usage: npm run tool -- <tool_name> [arg=value ...]\n');
    console.log('Available tools:');
    for (const tool of toolDefinitions) {
      console.log(`  ${tool.name.padEnd(20)} ${tool.description.slice(0, 50)}...`);
    }
    process.exit(0);
  }
  
  const toolName = args[0];
  const toolArgs: Record<string, unknown> = {};
  
  // Parse key=value arguments
  for (const arg of args.slice(1)) {
    const [key, ...valueParts] = arg.split('=');
    let value: unknown = valueParts.join('=');
    
    // Try to parse as JSON for booleans/numbers
    try {
      value = JSON.parse(value as string);
    } catch {
      // Keep as string
    }
    
    toolArgs[key] = value;
  }
  
  // Validate tool exists
  const tool = toolDefinitions.find(t => t.name === toolName);
  if (!tool) {
    console.error(`Unknown tool: ${toolName}`);
    console.error(`Run 'npm run tool -- --help' for available tools`);
    process.exit(1);
  }
  
  console.log(`Running: ${toolName}`);
  if (Object.keys(toolArgs).length > 0) {
    console.log(`Args: ${JSON.stringify(toolArgs)}`);
  }
  console.log('---');
  
  try {
    const result = await handleToolCall(toolName, toolArgs, workspacePath);
    
    // Extract text content from MCP response
    if (result.content && Array.isArray(result.content)) {
      for (const item of result.content) {
        if (item.type === 'text') {
          try {
            const parsed = JSON.parse(item.text);
            console.log(JSON.stringify(parsed, null, 2));
          } catch {
            console.log(item.text);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
