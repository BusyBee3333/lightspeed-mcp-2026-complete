import { LightspeedClient } from '../clients/lightspeed.js';
import type { Item } from '../types/index.js';

export function createProductTools(client: LightspeedClient) {
  return [
    {
      name: 'lightspeed_list_products',
      description: 'List all products/items with optional filters (archived, category, manufacturer, search)',
      inputSchema: {
        type: 'object',
        properties: {
          archived: { type: 'boolean', description: 'Filter by archived status' },
          categoryID: { type: 'number', description: 'Filter by category ID' },
          manufacturerID: { type: 'number', description: 'Filter by manufacturer ID' },
          customSku: { type: 'string', description: 'Search by custom SKU' },
          upc: { type: 'string', description: 'Search by UPC code' },
          limit: { type: 'number', description: 'Maximum items to return (default 100)', default: 100 },
        },
      },
      handler: async (args: any) => {
        const params: any = {};
        if (args.archived !== undefined) params.archived = args.archived;
        if (args.categoryID) params.categoryID = args.categoryID;
        if (args.manufacturerID) params.manufacturerID = args.manufacturerID;
        if (args.customSku) params.customSku = args.customSku;
        if (args.upc) params.upc = args.upc;
        
        const items = await client.getPaginated<Item>('/Item', params, args.limit || 100);
        return { items, count: items.length };
      },
    },
    {
      name: 'lightspeed_get_product',
      description: 'Get a specific product/item by ID with full details including prices, inventory, and tags',
      inputSchema: {
        type: 'object',
        properties: {
          itemID: { type: 'number', description: 'Product/Item ID' },
          loadRelations: { 
            type: 'array',
            items: { type: 'string' },
            description: 'Relations to load: Prices, ItemShops, Tags, Images, CustomFieldValues'
          },
        },
        required: ['itemID'],
      },
      handler: async (args: any) => {
        const params = args.loadRelations?.length
          ? { load_relations: JSON.stringify(args.loadRelations) }
          : undefined;
        const item = await client.get<{ Item: Item }>(`/Item/${args.itemID}`, params);
        return item.Item;
      },
    },
    {
      name: 'lightspeed_create_product',
      description: 'Create a new product/item',
      inputSchema: {
        type: 'object',
        properties: {
          description: { type: 'string', description: 'Product description/name' },
          customSku: { type: 'string', description: 'Custom SKU' },
          upc: { type: 'string', description: 'UPC barcode' },
          defaultCost: { type: 'number', description: 'Default cost' },
          categoryID: { type: 'number', description: 'Category ID' },
          manufacturerID: { type: 'number', description: 'Manufacturer ID' },
          defaultVendorID: { type: 'number', description: 'Default vendor ID' },
          tax: { type: 'boolean', description: 'Taxable', default: true },
          discountable: { type: 'boolean', description: 'Can be discounted', default: true },
          itemType: { 
            type: 'string', 
            enum: ['default', 'assembly', 'giftcard', 'service'],
            description: 'Item type',
            default: 'default'
          },
          prices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                amount: { type: 'string' },
                useType: { type: 'string', enum: ['Default', 'MSRP', 'Online'] },
              },
            },
            description: 'Price levels',
          },
        },
        required: ['description'],
      },
      handler: async (args: any) => {
        const item = await client.post<{ Item: Item }>('/Item', { Item: args });
        return item.Item;
      },
    },
    {
      name: 'lightspeed_update_product',
      description: 'Update an existing product/item',
      inputSchema: {
        type: 'object',
        properties: {
          itemID: { type: 'number', description: 'Product/Item ID' },
          description: { type: 'string' },
          customSku: { type: 'string' },
          upc: { type: 'string' },
          defaultCost: { type: 'number' },
          categoryID: { type: 'number' },
          manufacturerID: { type: 'number' },
          defaultVendorID: { type: 'number' },
          tax: { type: 'boolean' },
          discountable: { type: 'boolean' },
          archived: { type: 'boolean' },
          publishToEcom: { type: 'boolean' },
        },
        required: ['itemID'],
      },
      handler: async (args: any) => {
        const { itemID, ...updates } = args;
        const item = await client.put<{ Item: Item }>(`/Item/${itemID}`, { Item: updates });
        return item.Item;
      },
    },
    {
      name: 'lightspeed_delete_product',
      description: 'Archive (soft delete) a product/item',
      inputSchema: {
        type: 'object',
        properties: {
          itemID: { type: 'number', description: 'Product/Item ID to archive' },
        },
        required: ['itemID'],
      },
      handler: async (args: any) => {
        await client.delete(`/Item/${args.itemID}`);
        return { success: true, message: `Item ${args.itemID} archived` };
      },
    },
    {
      name: 'lightspeed_search_products',
      description: 'Advanced product search with multiple criteria',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (searches description, SKU, UPC)' },
          categoryID: { type: 'number' },
          manufacturerID: { type: 'number' },
          minPrice: { type: 'number' },
          maxPrice: { type: 'number' },
          inStock: { type: 'boolean', description: 'Only show items in stock' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' },
        },
      },
      handler: async (args: any) => {
        const params: any = { archived: false };
        if (args.categoryID) params.categoryID = args.categoryID;
        if (args.manufacturerID) params.manufacturerID = args.manufacturerID;
        
        let items = await client.getPaginated<Item>('/Item', params);
        
        // Client-side filtering for advanced criteria
        if (args.query) {
          const q = args.query.toLowerCase();
          items = items.filter(item => 
            item.description?.toLowerCase().includes(q) ||
            item.customSku?.toLowerCase().includes(q) ||
            item.upc?.toLowerCase().includes(q)
          );
        }
        
        if (args.inStock) {
          items = items.filter(item => 
            item.ItemShops?.some(shop => shop.qoh > 0)
          );
        }
        
        return { items, count: items.length };
      },
    },
    {
      name: 'lightspeed_bulk_update_products',
      description: 'Bulk update multiple products at once',
      inputSchema: {
        type: 'object',
        properties: {
          updates: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                itemID: { type: 'number' },
                data: { type: 'object' },
              },
              required: ['itemID', 'data'],
            },
            description: 'Array of product updates',
          },
        },
        required: ['updates'],
      },
      handler: async (args: any) => {
        const results = await client.batchUpdate('/Item', args.updates);
        return { updated: results.length, results };
      },
    },
    {
      name: 'lightspeed_get_product_inventory',
      description: 'Get inventory levels for a product across all shops/locations',
      inputSchema: {
        type: 'object',
        properties: {
          itemID: { type: 'number', description: 'Product/Item ID' },
        },
        required: ['itemID'],
      },
      handler: async (args: any) => {
        const item = await client.get<{ Item: Item }>(`/Item/${args.itemID}`, {
          load_relations: JSON.stringify(['ItemShops']),
        });
        return {
          itemID: args.itemID,
          shops: item.Item.ItemShops || [],
          totalQOH: item.Item.ItemShops?.reduce((sum, shop) => sum + shop.qoh, 0) || 0,
        };
      },
    },
    {
      name: 'lightspeed_adjust_product_inventory',
      description: 'Adjust inventory quantity for a product at a specific shop',
      inputSchema: {
        type: 'object',
        properties: {
          itemID: { type: 'number', description: 'Product/Item ID' },
          shopID: { type: 'number', description: 'Shop ID' },
          adjustment: { type: 'number', description: 'Quantity adjustment (positive or negative)' },
          reason: { type: 'string', description: 'Reason for adjustment' },
        },
        required: ['itemID', 'shopID', 'adjustment'],
      },
      handler: async (args: any) => {
        // Create inventory log entry
        const log = await client.post('/InventoryLog', {
          InventoryLog: {
            itemID: args.itemID,
            shopID: args.shopID,
            qohChange: args.adjustment,
            reason: args.reason || 'Manual adjustment',
            automated: false,
          },
        });
        return { success: true, log };
      },
    },
  ];
}
