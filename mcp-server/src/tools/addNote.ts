import { addNote } from '../storage/notes.js';
import { NoteType, ActionStatus } from '../types.js';

export const addNoteTool = {
  name: 'cb_add_note',
  description: 'Add a note, decision, action item, idea, or question to ContextBuddy',
  inputSchema: {
    type: 'object' as const,
    properties: {
      content: {
        type: 'string',
        description: 'The content of the note'
      },
      type: {
        type: 'string',
        enum: ['decision', 'note', 'action', 'idea', 'question'],
        description: 'Type of note'
      },
      team: {
        type: 'string',
        description: 'Team this note belongs to'
      },
      project: {
        type: 'string',
        description: 'Project this note belongs to'
      },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Tags for categorization'
      },
      assignee: {
        type: 'string',
        description: 'For actions: who is responsible'
      },
      due: {
        type: 'string',
        description: 'For actions: due date (ISO format)'
      },
      ticketId: {
        type: 'string',
        description: 'Link this note to a planning ticket'
      }
    },
    required: ['content', 'type']
  },
  handler: async (args: {
    content: string;
    type: NoteType;
    team?: string;
    project?: string;
    tags?: string[];
    assignee?: string;
    due?: string;
    ticketId?: string;
  }) => {
    const note = addNote(args.content, args.type, {
      team: args.team,
      project: args.project,
      tags: args.tags,
      assignee: args.assignee,
      due: args.due,
      ticketId: args.ticketId
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Note added: ${JSON.stringify(note, null, 2)}`
        }
      ]
    };
  }
};
