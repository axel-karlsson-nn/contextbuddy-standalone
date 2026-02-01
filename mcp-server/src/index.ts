#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';

import { storageExists } from './storage/index.js';
import { initializeStorage } from './storage/contexts.js';
import { listContextsTool } from './tools/listContexts.js';
import { addContextTool } from './tools/addContext.js';
import { addNoteTool } from './tools/addNote.js';
import { getRecentTool } from './tools/getRecent.js';
import { searchTool } from './tools/search.js';
import { suggestContextTool } from './tools/suggestContext.js';
import { deleteNoteTool } from './tools/deleteNote.js';
import { getConfigTool, setConfigTool } from './tools/getConfig.js';
import { updateTeamTool } from './tools/updateTeam.js';
import { addPeriodTool } from './tools/addPeriod.js';
import { addTicketTool } from './tools/addTicket.js';
import { updateTicketTool } from './tools/updateTicket.js';
import { addMilestoneTool } from './tools/addMilestone.js';

const tools = [
  listContextsTool,
  addContextTool,
  addNoteTool,
  getRecentTool,
  searchTool,
  suggestContextTool,
  deleteNoteTool,
  getConfigTool,
  setConfigTool,
  updateTeamTool,
  addPeriodTool,
  addTicketTool,
  updateTicketTool,
  addMilestoneTool
];

const server = new Server(
  {
    name: 'contextbuddy',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  // Ensure storage is initialized
  if (!storageExists()) {
    initializeStorage();
  }

  const tool = tools.find(t => t.name === name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }

  return tool.handler(args as any);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('ContextBuddy MCP server running');
}

main().catch(console.error);
