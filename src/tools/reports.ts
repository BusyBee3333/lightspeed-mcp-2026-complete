import { LightspeedClient } from '../clients/lightspeed.js';
import type { Sale, Item, Customer } from '../types/index.js';

export function createReportTools(client: LightspeedClient) {
  return [
    {
      name: 'lightspeed_sales_report',
      description: 'Generate sales report for a date range',
      inputSchema: {
        type: 'object',
        properties: {
          startDate: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
          endDate: { type: 'string', description: 'End date (YYYY-MM-DD)' },
          shopID: { type: 'number' },
          employeeID: { type: 'number' },
        },
        required: ['startDate', 'endDate'],
      },
      handler: async (args: any) => {
        const params: any = {
          completed: true,
          timeStamp: `>,${args.startDate}`,
        };
        if (args.shopID) params.shopID = args.shopID;
        if (args.employeeID) params.employeeID = args.employeeID;
        
        const sales = await client.getPaginated<Sale>('/Sale', params);
        const filtered = sales.filter(s => s.createTime <= args.endDate + 'T23:59:59');
        
        const totalRevenue = filtered.reduce((sum, s) => sum + s.total, 0);
        const totalTax = filtered.reduce((sum, s) => sum + s.calcTax1 + s.calcTax2, 0);
        const totalDiscounts = filtered.reduce((sum, s) => sum + s.calcDiscount, 0);
        
        return {
          period: `${args.startDate} to ${args.endDate}`,
          totalSales: filtered.length,
          totalRevenue,
          totalTax,
          totalDiscounts,
          averageTransaction: filtered.length > 0 ? totalRevenue / filtered.length : 0,
          sales: filtered.slice(0, 100),
        };
      },
    },
    {
      name: 'lightspeed_inventory_report',
      description: 'Generate inventory valuation and stock report',
      inputSchema: {
        type: 'object',
        properties: {
          shopID: { type: 'number' },
          categoryID: { type: 'number' },
          lowStock: { type: 'boolean', description: 'Only show low stock items' },
        },
      },
      handler: async (args: any) => {
        const params: any = { archived: false };
        if (args.categoryID) params.categoryID = args.categoryID;
        
        const items = await client.getPaginated<Item>('/Item', { ...params, load_relations: JSON.stringify(['ItemShops']) });
        
        let filteredItems = items;
        if (args.shopID) {
          filteredItems = items.filter(i => 
            i.ItemShops?.some(shop => shop.shopID === args.shopID)
          );
        }
        
        if (args.lowStock) {
          filteredItems = filteredItems.filter(i =>
            i.ItemShops?.some(shop => shop.qoh <= shop.reorderPoint)
          );
        }
        
        const totalValue = filteredItems.reduce((sum, i) => {
          const qoh = i.ItemShops?.reduce((s, shop) => s + shop.qoh, 0) || 0;
          return sum + (qoh * i.avgCost);
        }, 0);
        
        const totalItems = filteredItems.reduce((sum, i) => {
          return sum + (i.ItemShops?.reduce((s, shop) => s + shop.qoh, 0) || 0);
        }, 0);
        
        return {
          totalProducts: filteredItems.length,
          totalUnits: totalItems,
          totalValue,
          lowStockCount: filteredItems.filter(i =>
            i.ItemShops?.some(shop => shop.qoh <= shop.reorderPoint)
          ).length,
          items: filteredItems.slice(0, 100),
        };
      },
    },
    {
      name: 'lightspeed_customer_report',
      description: 'Generate customer analytics report',
      inputSchema: {
        type: 'object',
        properties: {
          topN: { type: 'number', description: 'Number of top customers to show', default: 20 },
        },
      },
      handler: async (args: any) => {
        const customers = await client.getPaginated<Customer>('/Customer', { archived: false });
        const sales = await client.getPaginated<Sale>('/Sale', { completed: true });
        
        const customerStats = customers.map(c => {
          const customerSales = sales.filter(s => s.customerID === c.customerID);
          return {
            customerID: c.customerID,
            name: `${c.firstName} ${c.lastName}`,
            company: c.company,
            totalSales: customerSales.length,
            totalRevenue: customerSales.reduce((sum, s) => sum + s.total, 0),
            averageOrder: customerSales.length > 0 
              ? customerSales.reduce((sum, s) => sum + s.total, 0) / customerSales.length 
              : 0,
          };
        });
        
        customerStats.sort((a, b) => b.totalRevenue - a.totalRevenue);
        
        return {
          totalCustomers: customers.length,
          topCustomers: customerStats.slice(0, args.topN || 20),
          averageCustomerValue: customerStats.reduce((sum, c) => sum + c.totalRevenue, 0) / customers.length,
        };
      },
    },
    {
      name: 'lightspeed_employee_performance_report',
      description: 'Generate employee sales performance report',
      inputSchema: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' },
        },
      },
      handler: async (args: any) => {
        const params: any = { completed: true };
        if (args.startDate) params.timeStamp = `>,${args.startDate}`;
        
        const sales = await client.getPaginated<Sale>('/Sale', params);
        const filtered = args.endDate 
          ? sales.filter(s => s.createTime <= args.endDate + 'T23:59:59')
          : sales;
        
        const employeeStats = new Map();
        
        filtered.forEach(sale => {
          if (!sale.employeeID) return;
          
          if (!employeeStats.has(sale.employeeID)) {
            employeeStats.set(sale.employeeID, {
              employeeID: sale.employeeID,
              totalSales: 0,
              totalRevenue: 0,
            });
          }
          
          const stats = employeeStats.get(sale.employeeID);
          stats.totalSales++;
          stats.totalRevenue += sale.total;
        });
        
        const results = Array.from(employeeStats.values())
          .map(e => ({
            ...e,
            averageSale: e.totalRevenue / e.totalSales,
          }))
          .sort((a, b) => b.totalRevenue - a.totalRevenue);
        
        return {
          period: args.startDate && args.endDate ? `${args.startDate} to ${args.endDate}` : 'All time',
          employees: results,
        };
      },
    },
    {
      name: 'lightspeed_product_performance_report',
      description: 'Generate top-selling products report',
      inputSchema: {
        type: 'object',
        properties: {
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          topN: { type: 'number', default: 50 },
        },
      },
      handler: async (args: any) => {
        const params: any = { completed: true };
        if (args.startDate) params.timeStamp = `>,${args.startDate}`;
        
        const sales = await client.getPaginated<Sale>('/Sale', { ...params, load_relations: JSON.stringify(['SaleLines']) });
        const filtered = args.endDate
          ? sales.filter(s => s.createTime <= args.endDate + 'T23:59:59')
          : sales;
        
        const productStats = new Map();
        
        filtered.forEach(sale => {
          sale.SaleLines?.forEach(line => {
            if (!productStats.has(line.itemID)) {
              productStats.set(line.itemID, {
                itemID: line.itemID,
                quantitySold: 0,
                revenue: 0,
              });
            }
            
            const stats = productStats.get(line.itemID);
            stats.quantitySold += line.unitQuantity;
            stats.revenue += line.calcTotal;
          });
        });
        
        const results = Array.from(productStats.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, args.topN || 50);
        
        return {
          period: args.startDate && args.endDate ? `${args.startDate} to ${args.endDate}` : 'All time',
          topProducts: results,
        };
      },
    },
  ];
}
