import { listContexts } from '../storage/contexts.js';

export const listContextsTool = {
  name: 'cb_list_contexts',
  description: 'List all teams and projects configured in ContextBuddy',
  inputSchema: {
    type: 'object' as const,
    properties: {},
    required: []
  },
  handler: async () => {
    const contexts = listContexts();
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(contexts, null, 2)
        }
      ]
    };
  }
};
