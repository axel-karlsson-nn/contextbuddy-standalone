import { addTeam, addProject } from '../storage/contexts.js';

export const addContextTool = {
  name: 'cb_add_context',
  description: 'Add a new team or project to ContextBuddy',
  inputSchema: {
    type: 'object' as const,
    properties: {
      type: {
        type: 'string',
        enum: ['team', 'project'],
        description: 'Type of context to add'
      },
      id: {
        type: 'string',
        description: 'Unique identifier for the context (lowercase, no spaces)'
      },
      name: {
        type: 'string',
        description: 'Display name for the context'
      },
      description: {
        type: 'string',
        description: 'Optional description'
      },
      parentTeam: {
        type: 'string',
        description: 'For projects: the team this project belongs to'
      }
    },
    required: ['type', 'id', 'name']
  },
  handler: async (args: {
    type: 'team' | 'project';
    id: string;
    name: string;
    description?: string;
    parentTeam?: string;
  }) => {
    let result;
    if (args.type === 'team') {
      result = addTeam(args.id, args.name, args.description);
    } else {
      result = addProject(args.id, args.name, args.parentTeam, args.description);
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: `Created ${args.type}: ${JSON.stringify(result, null, 2)}`
        }
      ]
    };
  }
};
