import { LightspeedClient } from '../clients/lightspeed.js';
import type { Vendor } from '../types/index.js';

export function createVendorTools(client: LightspeedClient) {
  return [
    {
      name: 'lightspeed_list_vendors',
      description: 'List all vendors/suppliers',
      inputSchema: {
        type: 'object',
        properties: {
          archived: { type: 'boolean' },
        },
      },
      handler: async (args: any) => {
        const params: any = {};
        if (args.archived !== undefined) params.archived = args.archived;
        const vendors = await client.getPaginated<Vendor>('/Vendor', params);
        return { vendors, count: vendors.length };
      },
    },
    {
      name: 'lightspeed_get_vendor',
      description: 'Get a specific vendor by ID',
      inputSchema: {
        type: 'object',
        properties: {
          vendorID: { type: 'number' },
        },
        required: ['vendorID'],
      },
      handler: async (args: any) => {
        const vendor = await client.get<{ Vendor: Vendor }>(`/Vendor/${args.vendorID}`, {
          load_relations: JSON.stringify(['Contact']),
        });
        return vendor.Vendor;
      },
    },
    {
      name: 'lightspeed_create_vendor',
      description: 'Create a new vendor/supplier',
      inputSchema: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          accountNumber: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          address1: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          zip: { type: 'string' },
        },
        required: ['name'],
      },
      handler: async (args: any) => {
        const { email, phone, address1, city, state, zip, ...vendorData } = args;
        const payload: any = { Vendor: vendorData };
        
        if (email || phone || address1) {
          payload.Vendor.Contact = {
            primaryEmail: email,
            phoneWork: phone,
            address1,
            city,
            state,
            zip,
          };
        }
        
        const vendor = await client.post<{ Vendor: Vendor }>('/Vendor', payload);
        return vendor.Vendor;
      },
    },
    {
      name: 'lightspeed_update_vendor',
      description: 'Update a vendor',
      inputSchema: {
        type: 'object',
        properties: {
          vendorID: { type: 'number' },
          name: { type: 'string' },
          accountNumber: { type: 'string' },
          archived: { type: 'boolean' },
        },
        required: ['vendorID'],
      },
      handler: async (args: any) => {
        const { vendorID, ...updates } = args;
        const vendor = await client.put<{ Vendor: Vendor }>(`/Vendor/${vendorID}`, { Vendor: updates });
        return vendor.Vendor;
      },
    },
    {
      name: 'lightspeed_delete_vendor',
      description: 'Archive a vendor',
      inputSchema: {
        type: 'object',
        properties: {
          vendorID: { type: 'number' },
        },
        required: ['vendorID'],
      },
      handler: async (args: any) => {
        await client.delete(`/Vendor/${args.vendorID}`);
        return { success: true, message: `Vendor ${args.vendorID} archived` };
      },
    },
  ];
}
