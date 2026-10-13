import { LightspeedClient } from '../clients/lightspeed.js';
import type { Customer, CreditAccount } from '../types/index.js';

export function createCustomerTools(client: LightspeedClient) {
  return [
    {
      name: 'lightspeed_list_customers',
      description: 'List all customers with optional filters',
      inputSchema: {
        type: 'object',
        properties: {
          archived: { type: 'boolean', description: 'Filter by archived status' },
          customerTypeID: { type: 'number', description: 'Filter by customer type' },
          limit: { type: 'number', default: 100 },
        },
      },
      handler: async (args: any) => {
        const params: any = {};
        if (args.archived !== undefined) params.archived = args.archived;
        if (args.customerTypeID) params.customerTypeID = args.customerTypeID;
        const customers = await client.getPaginated<Customer>('/Customer', params, args.limit || 100);
        return { customers, count: customers.length };
      },
    },
    {
      name: 'lightspeed_get_customer',
      description: 'Get a specific customer by ID with contact info and credit account',
      inputSchema: {
        type: 'object',
        properties: {
          customerID: { type: 'number', description: 'Customer ID' },
        },
        required: ['customerID'],
      },
      handler: async (args: any) => {
        const customer = await client.get<{ Customer: Customer }>(`/Customer/${args.customerID}`, {
          load_relations: JSON.stringify(['Contact', 'CreditAccount']),
        });
        return customer.Customer;
      },
    },
    {
      name: 'lightspeed_create_customer',
      description: 'Create a new customer',
      inputSchema: {
        type: 'object',
        properties: {
          firstName: { type: 'string', description: 'First name' },
          lastName: { type: 'string', description: 'Last name' },
          company: { type: 'string', description: 'Company name' },
          email: { type: 'string', description: 'Email address' },
          phone: { type: 'string', description: 'Phone number' },
          address1: { type: 'string' },
          address2: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          zip: { type: 'string' },
          country: { type: 'string' },
          customerTypeID: { type: 'number' },
        },
        required: ['firstName', 'lastName'],
      },
      handler: async (args: any) => {
        const { email, phone, address1, address2, city, state, zip, country, ...customerData } = args;
        
        const payload: any = { Customer: customerData };
        
        if (email || phone || address1) {
          payload.Customer.Contact = {
            primaryEmail: email,
            phoneMobile: phone,
            address1,
            address2,
            city,
            state,
            zip,
            country,
          };
        }
        
        const customer = await client.post<{ Customer: Customer }>('/Customer', payload);
        return customer.Customer;
      },
    },
    {
      name: 'lightspeed_update_customer',
      description: 'Update an existing customer',
      inputSchema: {
        type: 'object',
        properties: {
          customerID: { type: 'number' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          company: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string' },
          archived: { type: 'boolean' },
        },
        required: ['customerID'],
      },
      handler: async (args: any) => {
        const { customerID, ...updates } = args;
        const customer = await client.put<{ Customer: Customer }>(`/Customer/${customerID}`, { Customer: updates });
        return customer.Customer;
      },
    },
    {
      name: 'lightspeed_delete_customer',
      description: 'Archive a customer',
      inputSchema: {
        type: 'object',
        properties: {
          customerID: { type: 'number' },
        },
        required: ['customerID'],
      },
      handler: async (args: any) => {
        await client.delete(`/Customer/${args.customerID}`);
        return { success: true, message: `Customer ${args.customerID} archived` };
      },
    },
    {
      name: 'lightspeed_search_customers',
      description: 'Search customers by name, email, or phone',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
        required: ['query'],
      },
      handler: async (args: any) => {
        const customers = await client.getPaginated<Customer>('/Customer', { archived: false });
        const q = args.query.toLowerCase();
        const filtered = customers.filter(c => 
          c.firstName?.toLowerCase().includes(q) ||
          c.lastName?.toLowerCase().includes(q) ||
          c.company?.toLowerCase().includes(q) ||
          c.Contact?.primaryEmail?.toLowerCase().includes(q) ||
          c.Contact?.phoneMobile?.includes(q)
        );
        return { customers: filtered, count: filtered.length };
      },
    },
    {
      name: 'lightspeed_get_customer_credit_account',
      description: 'Get customer credit account/store credit balance',
      inputSchema: {
        type: 'object',
        properties: {
          customerID: { type: 'number' },
        },
        required: ['customerID'],
      },
      handler: async (args: any) => {
        const customer = await client.get<{ Customer: Customer }>(`/Customer/${args.customerID}`, {
          load_relations: JSON.stringify(['CreditAccount']),
        });
        return customer.Customer.CreditAccount || { balance: 0, message: 'No credit account' };
      },
    },
    {
      name: 'lightspeed_add_customer_credit',
      description: 'Add store credit to a customer account',
      inputSchema: {
        type: 'object',
        properties: {
          customerID: { type: 'number' },
          amount: { type: 'number', description: 'Amount to add' },
          reason: { type: 'string', description: 'Reason for credit' },
        },
        required: ['customerID', 'amount'],
      },
      handler: async (args: any) => {
        const creditAccount = await client.post<{ CreditAccount: CreditAccount }>('/CreditAccount', {
          CreditAccount: {
            customerID: args.customerID,
            creditLimit: args.amount,
            name: args.reason || 'Store Credit',
            giftCard: false,
          },
        });
        return creditAccount.CreditAccount;
      },
    },
  ];
}
