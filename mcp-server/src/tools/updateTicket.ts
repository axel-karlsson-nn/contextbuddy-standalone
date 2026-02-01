import { updateTicket, getTicketById } from '../storage/planning.js';
import { TicketStatus, SubDeliverable } from '../types.js';

export const updateTicketTool = {
  name: 'cb_update_ticket',
  description: 'Update a planning ticket (status, details, dependencies)',
  inputSchema: {
    type: 'object' as const,
    properties: {
      id: {
        type: 'string',
        description: 'Ticket ID to update'
      },
      initiative: {
        type: 'string',
        description: 'Updated initiative name'
      },
      deliverable: {
        type: 'string',
        description: 'Updated deliverable'
      },
      subDeliverables: {
        type: 'array',
        items: { type: 'string' },
        description: 'Updated list of sub-deliverables'
      },
      supports: {
        type: 'array',
        items: { type: 'string' },
        description: 'Updated team IDs that this ticket supports'
      },
      dependsOn: {
        type: 'array',
        items: { type: 'string' },
        description: 'Updated team IDs that this ticket depends on'
      },
      status: {
        type: 'string',
        enum: ['active', 'done', 'cancelled'],
        description: 'New status for the ticket'
      }
    },
    required: ['id']
  },
  handler: async (args: {
    id: string;
    initiative?: string;
    deliverable?: string;
    subDeliverables?: string[];
    supports?: string[];
    dependsOn?: string[];
    status?: TicketStatus;
  }) => {
    const existing = getTicketById(args.id);
    if (!existing) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Ticket not found: ${args.id}`
          }
        ],
        isError: true
      };
    }

    const updates: {
      initiative?: string;
      deliverable?: string;
      subDeliverables?: SubDeliverable[];
      supports?: string[];
      dependsOn?: string[];
      status?: TicketStatus;
    } = {};
    if (args.initiative !== undefined) updates.initiative = args.initiative;
    if (args.deliverable !== undefined) updates.deliverable = args.deliverable;
    if (args.subDeliverables !== undefined) {
      updates.subDeliverables = args.subDeliverables.map(s => ({ text: s, done: false }));
    }
    if (args.supports !== undefined) updates.supports = args.supports;
    if (args.dependsOn !== undefined) updates.dependsOn = args.dependsOn;
    if (args.status !== undefined) updates.status = args.status;

    const result = updateTicket(args.id, updates);

    return {
      content: [
        {
          type: 'text' as const,
          text: `Updated ticket: ${JSON.stringify(result, null, 2)}`
        }
      ]
    };
  }
};
