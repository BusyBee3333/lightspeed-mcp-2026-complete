import { LightspeedClient } from '../clients/lightspeed.js';
import type { Sale, SaleLine, SalePayment } from '../types/index.js';

export function createSalesTools(client: LightspeedClient) {
  return [
    {
      name: 'lightspeed_list_sales',
      description: 'List sales/transactions with filters',
      inputSchema: {
        type: 'object',
        properties: {
          completed: { type: 'boolean', description: 'Filter by completion status' },
          voided: { type: 'boolean', description: 'Include voided sales' },
          customerID: { type: 'number', description: 'Filter by customer' },
          employeeID: { type: 'number', description: 'Filter by employee' },
          registerID: { type: 'number', description: 'Filter by register' },
          timeStamp: { type: 'string', description: 'Filter by timestamp (>|<|=,YYYY-MM-DD)' },
          limit: { type: 'number', default: 100 },
        },
      },
      handler: async (args: any) => {
        const params: any = {};
        if (args.completed !== undefined) params.completed = args.completed;
        if (args.voided !== undefined) params.voided = args.voided;
        if (args.customerID) params.customerID = args.customerID;
        if (args.employeeID) params.employeeID = args.employeeID;
        if (args.registerID) params.registerID = args.registerID;
        if (args.timeStamp) params.timeStamp = args.timeStamp;
        const sales = await client.getPaginated<Sale>('/Sale', params, args.limit || 100);
        return { sales, count: sales.length, totalAmount: sales.reduce((sum, s) => sum + s.total, 0) };
      },
    },
    {
      name: 'lightspeed_get_sale',
      description: 'Get a specific sale/transaction with line items and payments',
      inputSchema: {
        type: 'object',
        properties: {
          saleID: { type: 'number', description: 'Sale ID' },
        },
        required: ['saleID'],
      },
      handler: async (args: any) => {
        const sale = await client.get<{ Sale: Sale }>(`/Sale/${args.saleID}`, {
          load_relations: JSON.stringify(['SaleLines', 'SalePayments']),
        });
        return sale.Sale;
      },
    },
    {
      name: 'lightspeed_create_sale',
      description: 'Create a new sale/transaction',
      inputSchema: {
        type: 'object',
        properties: {
          customerID: { type: 'number' },
          employeeID: { type: 'number' },
          registerID: { type: 'number' },
          shopID: { type: 'number', description: 'Shop/location ID' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                itemID: { type: 'number' },
                quantity: { type: 'number' },
                unitPrice: { type: 'number' },
              },
              required: ['itemID', 'quantity'],
            },
            description: 'Sale line items',
          },
        },
        required: ['shopID', 'items'],
      },
      handler: async (args: any) => {
        const salePayload: any = {
          shopID: args.shopID,
          completed: false,
        };
        if (args.customerID) salePayload.customerID = args.customerID;
        if (args.employeeID) salePayload.employeeID = args.employeeID;
        if (args.registerID) salePayload.registerID = args.registerID;
        
        const sale = await client.post<{ Sale: Sale }>('/Sale', { Sale: salePayload });
        const saleID = sale.Sale.saleID;
        
        // Add line items
        for (const item of args.items) {
          await client.post(`/SaleLine`, {
            SaleLine: {
              saleID,
              itemID: item.itemID,
              unitQuantity: item.quantity,
              unitPrice: item.unitPrice,
            },
          });
        }
        
        // Reload with lines
        const completeSale = await client.get<{ Sale: Sale }>(`/Sale/${saleID}`, {
          load_relations: JSON.stringify(['SaleLines']),
        });
        return completeSale.Sale;
      },
    },
    {
      name: 'lightspeed_complete_sale',
      description: 'Complete/finalize a sale transaction',
      inputSchema: {
        type: 'object',
        properties: {
          saleID: { type: 'number' },
          payments: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                paymentTypeID: { type: 'number', description: '0=Cash, 1=Credit Card, 2=Check, etc.' },
                amount: { type: 'number' },
              },
              required: ['paymentTypeID', 'amount'],
            },
          },
        },
        required: ['saleID', 'payments'],
      },
      handler: async (args: any) => {
        // Add payments
        for (const payment of args.payments) {
          await client.post('/SalePayment', {
            SalePayment: {
              saleID: args.saleID,
              paymentTypeID: payment.paymentTypeID,
              amount: payment.amount,
            },
          });
        }
        
        // Mark as completed
        const sale = await client.put<{ Sale: Sale }>(`/Sale/${args.saleID}`, {
          Sale: { completed: true },
        });
        
        return sale.Sale;
      },
    },
    {
      name: 'lightspeed_void_sale',
      description: 'Void a sale transaction',
      inputSchema: {
        type: 'object',
        properties: {
          saleID: { type: 'number' },
        },
        required: ['saleID'],
      },
      handler: async (args: any) => {
        const sale = await client.put<{ Sale: Sale }>(`/Sale/${args.saleID}`, {
          Sale: { voided: true },
        });
        return sale.Sale;
      },
    },
    {
      name: 'lightspeed_add_sale_payment',
      description: 'Add a payment to a sale',
      inputSchema: {
        type: 'object',
        properties: {
          saleID: { type: 'number' },
          paymentTypeID: { type: 'number', description: 'Payment type (0=Cash, 1=Card, 2=Check)' },
          amount: { type: 'number' },
          employeeID: { type: 'number' },
          registerID: { type: 'number' },
        },
        required: ['saleID', 'paymentTypeID', 'amount'],
      },
      handler: async (args: any) => {
        const payment = await client.post<{ SalePayment: SalePayment }>('/SalePayment', { SalePayment: args });
        return payment.SalePayment;
      },
    },
    {
      name: 'lightspeed_get_daily_sales',
      description: 'Get sales summary for a specific date',
      inputSchema: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Date (YYYY-MM-DD)' },
          shopID: { type: 'number' },
        },
        required: ['date'],
      },
      handler: async (args: any) => {
        const params: any = {
          completed: true,
          timeStamp: `>,${args.date} 00:00:00`,
        };
        if (args.shopID) params.shopID = args.shopID;
        
        const sales = await client.getPaginated<Sale>('/Sale', params);
        const totalSales = sales.length;
        const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
        const totalItems = sales.reduce((sum, s) => sum + (s.SaleLines?.length || 0), 0);
        
        return {
          date: args.date,
          totalSales,
          totalRevenue,
          totalItems,
          averageTransaction: totalSales > 0 ? totalRevenue / totalSales : 0,
          sales,
        };
      },
    },
    {
      name: 'lightspeed_refund_sale',
      description: 'Create a refund for a sale',
      inputSchema: {
        type: 'object',
        properties: {
          originalSaleID: { type: 'number', description: 'Original sale ID to refund' },
          items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                saleLineID: { type: 'number' },
                quantity: { type: 'number' },
              },
            },
            description: 'Items to refund',
          },
        },
        required: ['originalSaleID'],
      },
      handler: async (args: any) => {
        // Get original sale
        const originalSale = await client.get<{ Sale: Sale }>(`/Sale/${args.originalSaleID}`, {
          load_relations: JSON.stringify(['SaleLines']),
        });
        
        // Create refund sale
        const refund = await client.post<{ Sale: Sale }>('/Sale', {
          Sale: {
            shopID: originalSale.Sale.shopID,
            customerID: originalSale.Sale.customerID,
            employeeID: originalSale.Sale.employeeID,
            completed: true,
          },
        });
        
        // Add negative line items
        const itemsToRefund = args.items || originalSale.Sale.SaleLines;
        for (const item of itemsToRefund) {
          const originalLine = originalSale.Sale.SaleLines?.find(l => l.saleLineID === item.saleLineID);
          if (originalLine) {
            await client.post('/SaleLine', {
              SaleLine: {
                saleID: refund.Sale.saleID,
                itemID: originalLine.itemID,
                unitQuantity: -(item.quantity || originalLine.unitQuantity),
                unitPrice: originalLine.unitPrice,
              },
            });
          }
        }
        
        return refund.Sale;
      },
    },
  ];
}
