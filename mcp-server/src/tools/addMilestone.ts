import { addMilestone } from '../storage/milestones.js';
import { getProjects } from '../storage/contexts.js';

export const addMilestoneTool = {
  name: 'cb_add_milestone',
  description: 'Add a milestone to a project',
  inputSchema: {
    type: 'object' as const,
    properties: {
      projectId: {
        type: 'string',
        description: 'ID of the project'
      },
      name: {
        type: 'string',
        description: 'Milestone name'
      },
      targetDate: {
        type: 'string',
        description: 'Target date in ISO format (YYYY-MM-DD)'
      }
    },
    required: ['projectId', 'name', 'targetDate']
  },
  handler: async (args: {
    projectId: string;
    name: string;
    targetDate: string;
  }) => {
    // Validate project exists
    const projects = getProjects();
    if (!projects[args.projectId]) {
      return {
        content: [
          {
            type: 'text' as const,
            text: `Project not found: ${args.projectId}`
          }
        ],
        isError: true
      };
    }

    const result = addMilestone({
      projectId: args.projectId,
      name: args.name,
      targetDate: args.targetDate
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Created milestone: ${JSON.stringify(result, null, 2)}`
        }
      ]
    };
  }
};
