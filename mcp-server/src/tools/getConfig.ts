import { getConfig, saveConfig } from '../storage/contexts.js';
import { Config } from '../types.js';

export const getConfigTool = {
  name: 'cb_get_config',
  description: 'Get ContextBuddy configuration including capture mode',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: []
  },
  handler: async () => {
    const config = getConfig();
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(config, null, 2)
        }
      ]
    };
  }
};

export const setConfigTool = {
  name: 'cb_set_config',
  description: 'Update ContextBuddy configuration',
  inputSchema: {
    type: 'object' as const,
    properties: {
      autoCapture: {
        type: 'string',
        enum: ['aggressive', 'conservative', 'off'],
        description: 'Capture mode: aggressive (capture everything), conservative (only explicit signals), off (manual only)'
      },
      defaultTeam: {
        type: 'string',
        description: 'Default team for new notes (team ID)'
      }
    },
    required: []
  },
  handler: async (args: { autoCapture?: Config['autoCapture']; defaultTeam?: string }) => {
    const config = getConfig();

    if (args.autoCapture) {
      config.autoCapture = args.autoCapture;
    }
    if (args.defaultTeam !== undefined) {
      config.defaultTeam = args.defaultTeam;
    }

    saveConfig(config);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Configuration updated: ${JSON.stringify(config, null, 2)}`
        }
      ]
    };
  }
};
