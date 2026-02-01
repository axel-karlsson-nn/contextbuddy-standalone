import { addPeriod } from '../storage/planning.js';

export const addPeriodTool = {
  name: 'cb_add_period',
  description: 'Create a new planning period (e.g., P1 2026)',
  inputSchema: {
    type: 'object' as const,
    properties: {
      name: {
        type: 'string',
        description: 'Period name (e.g., "P1 2026")'
      },
      startDate: {
        type: 'string',
        description: 'Start date in ISO format (YYYY-MM-DD)'
      },
      endDate: {
        type: 'string',
        description: 'End date in ISO format (YYYY-MM-DD)'
      },
      year: {
        type: 'number',
        description: 'Year of the planning period'
      }
    },
    required: ['name', 'startDate', 'endDate', 'year']
  },
  handler: async (args: {
    name: string;
    startDate: string;
    endDate: string;
    year: number;
  }) => {
    const result = addPeriod({
      name: args.name,
      startDate: args.startDate,
      endDate: args.endDate,
      year: args.year
    });

    return {
      content: [
        {
          type: 'text' as const,
          text: `Created planning period: ${JSON.stringify(result, null, 2)}`
        }
      ]
    };
  }
};
