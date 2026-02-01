import { updateTeam, getTeamById } from '../storage/contexts.js';

export const updateTeamTool = {
  name: 'cb_update_team',
  description: 'Update team details including responsibilities',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string',
        description: 'Team ID to update'
      },
      name: {
        type: 'string',
        description: 'New display name for the team'
      },
      description: {
        type: 'string',
        description: 'New description for the team'
      },
      responsibilities: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of team responsibilities'
      },
      isMyTeam: {
        type: 'boolean',
        description: 'Whether this is one of your teams (vs external teams you collaborate with)'
      }
    },
    required: ['id']
  },
  handler: async (args: {
    id: string;
    name?: string;
    description?: string;
    responsibilities?: string[];
    isMyTeam?: boolean;
  }) => {
    const existing = getTeamById(args.id);
    if (!existing) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Team not found: ${args.id}`
          }
        ],
        isError: true
      };
    }

    const updates: { name?: string; description?: string; responsibilities?: string[]; isMyTeam?: boolean } = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.responsibilities !== undefined) updates.responsibilities = args.responsibilities;
    if (args.isMyTeam !== undefined) updates.isMyTeam = args.isMyTeam;

    const result = updateTeam(args.id, updates);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Updated team: ${JSON.stringify(result, null, 2)}`
        }
      ]
    };
  }
};
