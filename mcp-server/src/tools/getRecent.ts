import { getRecentNotes } from '../storage/notes.js';

export const getRecentTool = {
  name: 'cb_get_recent',
  description: 'Get recent notes from ContextBuddy (last 7 days by default)',
  inputSchema: {
    type: 'object' as const,
    properties: {
      days: {
        type: 'number',
        description: 'Number of days to look back (default: 7)'
      }
    },
    required: []
  },
  handler: async (args: { days?: number }) => {
    const notes = getRecentNotes(args.days || 7);

    return {
      content: [
        {
          type: 'text' as const,
          text: notes.length > 0
            ? JSON.stringify(notes, null, 2)
            : 'No notes found in the specified time period.'
        }
      ]
    };
  }
};
