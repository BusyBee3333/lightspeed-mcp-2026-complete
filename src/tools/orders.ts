import { LightspeedClient } from '../clients/lightspeed.js';
import type { Order, OrderLine } from '../types/index.js';

export function createOrderTools(client: LightspeedClient) {
  return [
    {
      name: 'lightspeed_list_orders',
      description: 'List purchase orders to vendors',
      inputSchema: {
        type: 'object',
        properties: {
          vendorID: { type: 'number' },
          shopID: { type: 'number' },
          complete: { type: 'boolean' },
          archived: { type: 'boolean' },
          limit: { type: 'number', default: 100 },
        },
      },
      handler: async (args: any) => {
        const params: any = {};
        if (args.vendorID) params.vendorID = args.vendorID;
        if (args.shopID) params.shopID = args.shopID;
        if (args.complete !== undefined) params.complete = args.complete;
        if (args.archived !== undefined) params.archived = args.archived;
        const orders = await client.getPaginated<Order>('/Order', params, args.limit || 100);
        return { orders, count: orders.length };
      },
    },
    {
      name: 'lightspeed_get_order',
      description: 'Get a specific purchase order with line items',
      inputSchema: {
        type: 'object',
        properties: {
          orderID: { type: 'number' },
        },
        required: ['orderID'],
      },
      handler: async (args: any) => {
        const order = await client.get<{ Order: Order }>(`/Order/${args.orderID}`, {
          load_relations: JSON.stringify(['OrderLines']),
        });
        return order.Order;
      },
    },
    {
      name: 'lightspeed_create_order',
      description: 'Create a new purchase order to a vendor',
      inputSchema: {
        type: 'object',
        properties: {
          vendorID: { type: 'number' },
          shopID: { type: 'number' },
          orderedDate: { type: 'string' },
          arrivalDate: { type: 'string' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                itemID: { type: 'number' },
                quantity: { type: 'number' },
                price: { type: 'number' },
              },
              required: ['itemID', 'quantity'],
            },
          },
        },
        required: ['vendorID', 'shopID', 'items'],
      },
      handler: async (args: any) => {
        const order = await client.post<{ Order: Order }>('/Order', {
          Order: {
            vendorID: args.vendorID,
            shopID: args.shopID,
            orderedDate: args.orderedDate || new Date().toISOString(),
            arrivalDate: args.arrivalDate,
          },
        });
        
        const orderID = order.Order.orderID;
        
        for (const item of args.items) {
          await client.post('/OrderLine', {
            OrderLine: {
              orderID,
              itemID: item.itemID,
              quantity: item.quantity,
              price: item.price,
            },
          });
        }
        
        const completeOrder = await client.get<{ Order: Order }>(`/Order/${orderID}`, {
          load_relations: JSON.stringify(['OrderLines']),
        });
        return completeOrder.Order;
      },
    },
    {
      name: 'lightspeed_receive_order',
      description: 'Receive/complete a purchase order',
      inputSchema: {
        type: 'object',
        properties: {
          orderID: { type: 'number' },
          receivedItems: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                orderLineID: { type: 'number' },
                quantityReceived: { type: 'number' },
              },
            },
          },
        },
        required: ['orderID'],
      },
      handler: async (args: any) => {
        // Update order lines with received quantities
        if (args.receivedItems) {
          for (const item of args.receivedItems) {
            await client.put(`/OrderLine/${item.orderLineID}`, {
              OrderLine: { numReceived: item.quantityReceived },
            });
          }
        }
        
        // Mark order as complete
        const order = await client.put<{ Order: Order }>(`/Order/${args.orderID}`, {
          Order: {
            complete: true,
            receivedDate: new Date().toISOString(),
          },
        });
        
        return order.Order;
      },
    },
    {
      name: 'lightspeed_update_order',
      description: 'Update a purchase order',
      inputSchema: {
        type: 'object',
        properties: {
          orderID: { type: 'number' },
          arrivalDate: { type: 'string' },
          shipInstructions: { type: 'string' },
          stockInstructions: { type: 'string' },
        },
        required: ['orderID'],
      },
      handler: async (args: any) => {
        const { orderID, ...updates } = args;
        const order = await client.put<{ Order: Order }>(`/Order/${orderID}`, { Order: updates });
        return order.Order;
      },
    },
    {
      name: 'lightspeed_delete_order',
      description: 'Archive a purchase order',
      inputSchema: {
        type: 'object',
        properties: {
          orderID: { type: 'number' },
        },
        required: ['orderID'],
      },
      handler: async (args: any) => {
        await client.delete(`/Order/${args.orderID}`);
        return { success: true, message: `Order ${args.orderID} archived` };
      },
    },
  ];
}
