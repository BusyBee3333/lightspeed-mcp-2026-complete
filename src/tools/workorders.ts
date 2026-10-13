import { LightspeedClient } from '../clients/lightspeed.js';
import type { Workorder } from '../types/index.js';

export function createWorkorderTools(client: LightspeedClient) {
  return [
    {
      name: 'lightspeed_list_workorders',
      description: 'List all service workorders',
      inputSchema: {
        type: 'object',
        properties: {
          customerID: { type: 'number' },
          shopID: { type: 'number' },
          archived: { type: 'boolean' },
        },
      },
      handler: async (args: any) => {
        const params: any = {};
        if (args.customerID) params.customerID = args.customerID;
        if (args.shopID) params.shopID = args.shopID;
        if (args.archived !== undefined) params.archived = args.archived;
        const workorders = await client.getPaginated<Workorder>('/Workorder', params);
        return { workorders, count: workorders.length };
      },
    },
    {
      name: 'lightspeed_get_workorder',
      description: 'Get a specific workorder by ID',
      inputSchema: {
        type: 'object',
        properties: {
          workorderID: { type: 'number' },
        },
        required: ['workorderID'],
      },
      handler: async (args: any) => {
        const workorder = await client.get<{ Workorder: Workorder }>(`/Workorder/${args.workorderID}`, {
          load_relations: JSON.stringify(['WorkorderItems']),
        });
        return workorder.Workorder;
      },
    },
    {
      name: 'lightspeed_create_workorder',
      description: 'Create a new service workorder',
      inputSchema: {
        type: 'object',
        properties: {
          customerID: { type: 'number' },
          shopID: { type: 'number' },
          note: { type: 'string' },
          warranty: { type: 'boolean', default: false },
          etaOut: { type: 'string', description: 'Estimated completion date' },
        },
        required: ['customerID', 'shopID'],
      },
      handler: async (args: any) => {
        const workorder = await client.post<{ Workorder: Workorder }>('/Workorder', {
          Workorder: {
            ...args,
            timeIn: new Date().toISOString(),
          },
        });
        return workorder.Workorder;
      },
    },
    {
      name: 'lightspeed_update_workorder_status',
      description: 'Update workorder status',
      inputSchema: {
        type: 'object',
        properties: {
          workorderID: { type: 'number' },
          workorderStatusID: { type: 'number' },
          note: { type: 'string' },
        },
        required: ['workorderID'],
      },
      handler: async (args: any) => {
        const { workorderID, ...updates } = args;
        const workorder = await client.put<{ Workorder: Workorder }>(`/Workorder/${workorderID}`, { Workorder: updates });
        return workorder.Workorder;
      },
    },
  ];
}
