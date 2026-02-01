import { addTicket, getPeriodById } from '../storage/planning.js';
import { getTeamById } from '../storage/contexts.js';

export const addTicketTool = {
  name: 'cb_add_ticket',
  description: 'Create a new planning ticket with dependencies',
  inputSchema: {
    type: 'object' as const,
    properties: {
      periodId: {
        type: 'string',
        description: 'ID of the planning period'
      },
      initiative: {
        type: 'string',
        description: 'High-level initiative name'
      },
      deliverable: {
        type: 'string',
        description: 'Main deliverable for this ticket'
      },
      subDeliverables: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of sub-deliverables'
      },
      teamId: {
        type: 'string',
        description: 'ID of the team owning this ticket'
      },
      supports: {
        type: 'array',
        items: { type: 'string' },
        description: 'Team IDs that this ticket supports'
      },
      dependsOn: {
        type: 'array',
        items: { type: 'string' },
        description: 'Team IDs that this ticket depends on'
      }
    },
    required: ['periodId', 'initiative', 'deliverable', 'teamId']
  },
  handler: async (args: {
    periodId: string;
    initiative: string;
    deliverable: string;
    subDeliverables?: string[];
    teamId: string;
    supports?: string[];
    dependsOn?: string[];
  }) => {
    // Validate period exists
    const period = getPeriodById(args.periodId);
    if (!period) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Planning period not found: ${args.periodId}`
          }
        ],
        isError: true
      };
    }

    // Validate team exists
    const team = getTeamById(args.teamId);
    if (!team) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Team not found: ${args.teamId}`
          }
        ],
        isError: true
      };
    }

    const result = addTicket({
      periodId: args.periodId,
      initiative: args.initiative,
      deliverable: args.deliverable,
      subDeliverables: (args.subDeliverables || []).map(s => ({ text: s, done: false })),
      teamId: args.teamId,
      supports: args.supports || [],
      dependsOn: args.dependsOn || []
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Created ticket: ${JSON.stringify(result, null, 2)}`
        }
      ]
    };
  }
};
