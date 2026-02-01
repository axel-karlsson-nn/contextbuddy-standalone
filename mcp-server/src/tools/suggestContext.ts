import { suggestContext } from '../storage/notes.js';

export const suggestContextTool = {
  name: 'cb_suggest_context',
  description: 'Analyze text and suggest team, project, type, and tags for a note',
  inputSchema: {
    type: 'object' as const,
    properties: {
      text: {
        type: 'string',
        description: 'Text to analyze for context suggestions'
      }
    },
    required: ['text']
  },
  handler: async (args: { text: string }) => {
    const suggestion = suggestContext(args.text);

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(suggestion, null, 2)
        }
      ]
    };
  }
};
