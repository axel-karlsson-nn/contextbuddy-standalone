import { searchNotes } from '../storage/notes.js';
import { NoteType } from '../types.js';

export const searchTool = {
  name: 'cb_search',
  description: 'Search notes in ContextBuddy by query, team, project, type, or date range',
  inputSchema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Text to search for in note content and tags'
      },
      team: {
        type: 'string',
        description: 'Filter by team'
      },
      project: {
        type: 'string',
        description: 'Filter by project'
      },
      type: {
        type: 'string',
        enum: ['decision', 'note', 'action', 'idea', 'question'],
        description: 'Filter by note type'
      },
      from: {
        type: 'string',
        description: 'Start date (ISO format)'
      },
      to: {
        type: 'string',
        description: 'End date (ISO format)'
      }
    },
    required: []
  },
  handler: async (args: {
    query?: string;
    team?: string;
    project?: string;
    type?: NoteType;
    from?: string;
    to?: string;
  }) => {
    const notes = searchNotes(args);

    return {
      content: [
        {
          type: 'text' as const,
          text: notes.length > 0
            ? JSON.stringify(notes, null, 2)
            : 'No notes found matching your criteria.'
        }
      ]
    };
  }
};
