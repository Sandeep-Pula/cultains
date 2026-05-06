import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { defineSecret, defineString } from 'firebase-functions/params';
import { onRequest } from 'firebase-functions/v2/https';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { z } from 'zod';

initializeApp();

const OPENAI_API_KEY = defineSecret('OPENAI_API_KEY');
const OPENAI_WORKFLOW_ID = defineString('OPENAI_WORKFLOW_ID');

type AccountType = 'owner' | 'team_member' | 'super_admin';

type WorkspaceProfile = {
  accountType?: AccountType;
  companyName?: string;
  userName?: string;
  email?: string;
  businessType?: string;
  city?: string;
  workspaceOwnerId?: string;
};

type AnalyticsScope =
  | 'snapshot'
  | 'inventory'
  | 'sales'
  | 'customers'
  | 'finance'
  | 'team'
  | 'operations'
  | 'timesheets';

type FirestoreRow = Record<string, unknown> & { id: string };

const db = getFirestore();

const json = (response: Parameters<Parameters<typeof onRequest>[0]>[1], status: number, body: unknown) => {
  response.status(status).json(body);
};

const readJsonBody = <T>(body: unknown): T => {
  if (!body || typeof body !== 'object') return {} as T;
  return body as T;
};

const getBearerToken = (authorizationHeader: string | string[] | undefined) => {
  const authorization = Array.isArray(authorizationHeader) ? authorizationHeader[0] : authorizationHeader;
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || '';
};

const requireOwnerProfile = async (authorizationHeader: string | string[] | undefined) => {
  const token = getBearerToken(authorizationHeader);
  if (!token) {
    throw new Error('MISSING_AUTH_TOKEN');
  }

  const decoded = await getAuth().verifyIdToken(token);
  const profileSnapshot = await db.doc(`users/${decoded.uid}`).get();

  if (!profileSnapshot.exists) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  const profile = profileSnapshot.data() as WorkspaceProfile;
  if ((profile.accountType || 'owner') !== 'owner') {
    throw new Error('OWNER_ONLY');
  }

  return {
    uid: decoded.uid,
    email: decoded.email || profile.email || '',
    profile,
  };
};

const toNumber = (value: unknown) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
};

const toDate = (value: unknown) => {
  if (typeof value !== 'string') return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const yyyyMmDd = (date: Date) => date.toISOString().slice(0, 10);

const parseDateRange = (body: { startDate?: string; endDate?: string; year?: number }) => {
  if (body.startDate && body.endDate) {
    return {
      start: new Date(`${body.startDate}T00:00:00.000+05:30`),
      end: new Date(`${body.endDate}T23:59:59.999+05:30`),
    };
  }

  if (body.year) {
    return {
      start: new Date(`${body.year}-01-01T00:00:00.000+05:30`),
      end: new Date(`${body.year}-12-31T23:59:59.999+05:30`),
    };
  }

  const now = new Date();
  const today = yyyyMmDd(now);
  return {
    start: new Date(`${today}T00:00:00.000+05:30`),
    end: new Date(`${today}T23:59:59.999+05:30`),
  };
};

const getCollection = async (ownerUid: string, collectionName: string) => {
  const snapshot = await db.collection('users').doc(ownerUid).collection(collectionName).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) as FirestoreRow[];
};

const filterByCreatedAt = (rows: FirestoreRow[], start: Date, end: Date) =>
  rows.filter((row) => {
    const date = toDate(row.createdAt);
    return date ? date >= start && date <= end : false;
  });

const summarizeSales = (salesInvoices: FirestoreRow[], start: Date, end: Date) => {
  const finalizedInvoices = filterByCreatedAt(salesInvoices, start, end).filter((invoice) => invoice.status !== 'draft');
  const lineItemMap = new Map<string, { itemName: string; quantity: number; revenue: number }>();

  for (const invoice of finalizedInvoices) {
    const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    for (const line of lineItems) {
      const key = String(line.inventoryItemId || line.itemName || 'unknown');
      const current = lineItemMap.get(key) || {
        itemName: String(line.itemName || 'Unknown item'),
        quantity: 0,
        revenue: 0,
      };
      current.quantity += toNumber(line.quantity);
      current.revenue += toNumber(line.lineSubtotal);
      lineItemMap.set(key, current);
    }
  }

  return {
    startDate: yyyyMmDd(start),
    endDate: yyyyMmDd(end),
    invoiceCount: finalizedInvoices.length,
    paidInvoiceCount: finalizedInvoices.filter((invoice) => invoice.paymentStatus === 'paid').length,
    pendingInvoiceCount: finalizedInvoices.filter((invoice) => invoice.paymentStatus === 'pending').length,
    subtotal: finalizedInvoices.reduce((sum, invoice) => sum + toNumber(invoice.subtotal), 0),
    taxAmount: finalizedInvoices.reduce((sum, invoice) => sum + toNumber(invoice.taxAmount), 0),
    totalRevenue: finalizedInvoices.reduce((sum, invoice) => sum + toNumber(invoice.totalAmount), 0),
    topProducts: Array.from(lineItemMap.values())
      .sort((left, right) => right.revenue - left.revenue)
      .slice(0, 10),
    recentInvoices: finalizedInvoices
      .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
      .slice(0, 10)
      .map((invoice) => ({
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        totalAmount: toNumber(invoice.totalAmount),
        paymentStatus: invoice.paymentStatus,
        paymentMethod: invoice.paymentMethod,
        createdAt: invoice.createdAt,
      })),
  };
};

const summarizeInventory = (inventory: FirestoreRow[], salesInvoices: FirestoreRow[]) => {
  const soldQuantityByItem = new Map<string, number>();
  for (const invoice of salesInvoices.filter((item) => item.status !== 'draft')) {
    const lineItems = Array.isArray(invoice.lineItems) ? invoice.lineItems : [];
    for (const line of lineItems) {
      const key = String(line.inventoryItemId || '');
      if (!key) continue;
      soldQuantityByItem.set(key, (soldQuantityByItem.get(key) || 0) + toNumber(line.quantity));
    }
  }

  const items = inventory.map((item) => {
    const currentStock = toNumber(item.currentStock);
    const minimumStock = toNumber(item.minimumStock);
    return {
      id: item.id,
      name: item.name,
      sku: item.sku,
      category: item.category,
      unit: item.unit,
      currentStock,
      reservedStock: toNumber(item.reservedStock),
      minimumStock,
      reorderQuantity: toNumber(item.reorderQuantity),
      stockValue: currentStock * toNumber(item.costPerUnit),
      sellingValue: currentStock * toNumber(item.sellingPrice),
      status: currentStock <= 0 ? 'out-of-stock' : currentStock <= minimumStock ? 'low-stock' : 'in-stock',
      supplierName: item.supplierName,
      storageLocation: item.storageLocation,
      soldQuantity: soldQuantityByItem.get(item.id) || 0,
    };
  });

  return {
    totalItems: items.length,
    totalUnitsInStock: items.reduce((sum, item) => sum + item.currentStock, 0),
    totalStockCostValue: items.reduce((sum, item) => sum + item.stockValue, 0),
    totalStockSellingValue: items.reduce((sum, item) => sum + item.sellingValue, 0),
    lowStockCount: items.filter((item) => item.status === 'low-stock').length,
    outOfStockCount: items.filter((item) => item.status === 'out-of-stock').length,
    lowStockItems: items
      .filter((item) => item.status !== 'in-stock')
      .sort((left, right) => left.currentStock - right.currentStock)
      .slice(0, 25),
    topMovingItems: [...items].sort((left, right) => right.soldQuantity - left.soldQuantity).slice(0, 10),
  };
};

const summarizeCustomers = (customers: FirestoreRow[]) => {
  const byStage = customers.reduce<Record<string, number>>((current, customer) => {
    const stage = String(customer.stage || 'unknown');
    current[stage] = (current[stage] || 0) + 1;
    return current;
  }, {});

  return {
    totalCustomers: customers.length,
    byStage,
    needsFollowUp: customers.filter((customer) => Boolean(customer.needsFollowUp)).length,
    renderPending: customers.filter((customer) => Boolean(customer.renderPending)).length,
    pinned: customers.filter((customer) => Boolean(customer.pinned)).length,
    activeCustomers: customers
      .filter((customer) => customer.stage !== 'completed' && customer.stage !== 'on_hold')
      .slice(0, 20)
      .map((customer) => ({
        customerName: customer.customerName,
        company: customer.company,
        title: customer.title,
        stage: customer.stage,
        priority: customer.priority,
        progress: toNumber(customer.progress),
        nextFollowUpAt: customer.nextFollowUpAt,
        quoteValue: toNumber(
          customer.quote && typeof customer.quote === 'object' && 'quoteValue' in customer.quote
            ? customer.quote.quoteValue
            : 0,
        ),
      })),
  };
};

const summarizeFinance = (financeEntries: FirestoreRow[], weeklyMiscRecords: FirestoreRow[]) => {
  const income = financeEntries.filter((entry) => entry.kind === 'income');
  const expenses = financeEntries.filter((entry) => entry.kind === 'expense');

  return {
    totalIncome: income.reduce((sum, entry) => sum + toNumber(entry.amount), 0),
    totalExpenses: expenses.reduce((sum, entry) => sum + toNumber(entry.amount), 0),
    pendingReceivables: income.filter((entry) => entry.status !== 'paid').reduce((sum, entry) => sum + toNumber(entry.amount), 0),
    pendingPayables: expenses.filter((entry) => entry.status !== 'paid').reduce((sum, entry) => sum + toNumber(entry.amount), 0),
    weeklyMiscTotal: weeklyMiscRecords.reduce((sum, record) => sum + toNumber(record.amount), 0),
    recentEntries: financeEntries
      .sort((left, right) => String(right.createdAt || '').localeCompare(String(left.createdAt || '')))
      .slice(0, 15)
      .map((entry) => ({
        title: entry.title,
        kind: entry.kind,
        category: entry.category,
        amount: toNumber(entry.amount),
        status: entry.status,
        dueAt: entry.dueAt,
      })),
  };
};

const buildAnalyticsPayload = async (ownerUid: string, body: { scope?: AnalyticsScope; startDate?: string; endDate?: string; year?: number }) => {
  const scope = body.scope || 'snapshot';
  const [inventory, salesInvoices, customers, team, tasks, financeEntries, weeklyMiscRecords, timesheets, leaveRequests] = await Promise.all([
    getCollection(ownerUid, 'inventoryItems'),
    getCollection(ownerUid, 'salesInvoices'),
    getCollection(ownerUid, 'customers'),
    getCollection(ownerUid, 'teamMembers'),
    getCollection(ownerUid, 'tasks'),
    getCollection(ownerUid, 'financeEntries'),
    getCollection(ownerUid, 'weeklyMiscRecords'),
    getCollection(ownerUid, 'timesheets'),
    getCollection(ownerUid, 'leaveRequests'),
  ]);
  const { start, end } = parseDateRange(body);

  const common = {
    generatedAt: new Date().toISOString(),
    scope,
  };

  const inventorySummary = summarizeInventory(inventory, salesInvoices);
  const salesSummary = summarizeSales(salesInvoices, start, end);
  const customerSummary = summarizeCustomers(customers);
  const financeSummary = summarizeFinance(financeEntries, weeklyMiscRecords);

  if (scope === 'inventory') return { ...common, inventory: inventorySummary };
  if (scope === 'sales') return { ...common, sales: salesSummary };
  if (scope === 'customers') return { ...common, customers: customerSummary };
  if (scope === 'finance') return { ...common, finance: financeSummary };
  if (scope === 'team') {
    return {
      ...common,
      team: {
        totalMembers: team.length,
        loginEnabled: team.filter((member) => Boolean(member.loginEnabled)).length,
        online: team.filter((member) => member.status === 'online').length,
        busy: team.filter((member) => member.status === 'busy').length,
        members: team.map((member) => ({
          name: member.name,
          role: member.role,
          status: member.status,
          activeProjects: toNumber(member.activeProjects),
          workload: toNumber(member.workload),
        })),
      },
    };
  }
  if (scope === 'operations') {
    return {
      ...common,
      operations: {
        openTasks: tasks.filter((task) => !task.done).length,
        completedTasks: tasks.filter((task) => Boolean(task.done)).length,
        overdueTasks: tasks.filter((task) => !task.done && toDate(task.dueAt) && toDate(task.dueAt)! < new Date()).length,
        upcomingTasks: tasks
          .filter((task) => !task.done)
          .sort((left, right) => String(left.dueAt || '').localeCompare(String(right.dueAt || '')))
          .slice(0, 15)
          .map((task) => ({
            title: task.title,
            dueAt: task.dueAt,
            priority: task.priority,
          })),
      },
    };
  }
  if (scope === 'timesheets') {
    return {
      ...common,
      timesheets: {
        entries: timesheets.length,
        leaveRequests: leaveRequests.length,
        pendingLeaves: leaveRequests.filter((leave) => leave.status === 'pending').length,
        approvedLeaves: leaveRequests.filter((leave) => leave.status === 'approved').length,
      },
    };
  }

  return {
    ...common,
    inventory: inventorySummary,
    sales: salesSummary,
    customers: customerSummary,
    finance: financeSummary,
    team: {
      totalMembers: team.length,
      loginEnabled: team.filter((member) => Boolean(member.loginEnabled)).length,
    },
    operations: {
      openTasks: tasks.filter((task) => !task.done).length,
      completedTasks: tasks.filter((task) => Boolean(task.done)).length,
    },
    timesheets: {
      entries: timesheets.length,
      pendingLeaves: leaveRequests.filter((leave) => leave.status === 'pending').length,
    },
  };
};

const createMcpServer = (authorizationHeader: string | string[] | undefined) => {
  const server = new McpServer({
    name: 'pulabiz-business-data',
    version: '1.0.0',
  });

  const analyticsSchema = {
    scope: z.enum(['snapshot', 'inventory', 'sales', 'customers', 'finance', 'team', 'operations', 'timesheets']).default('snapshot'),
    startDate: z.string().optional().describe('Inclusive start date in YYYY-MM-DD format.'),
    endDate: z.string().optional().describe('Inclusive end date in YYYY-MM-DD format.'),
    year: z.number().int().min(2000).max(2100).optional().describe('Calendar year for annual reports.'),
  };

  server.registerTool(
    'get_business_analytics',
    {
      title: 'Get business analytics',
      description: 'Read-only analytics for the authenticated Pulabiz business owner across sales, inventory, customers, finance, team, operations, and timesheets.',
      inputSchema: analyticsSchema,
      annotations: {
        readOnlyHint: true,
      },
    },
    async (args) => {
      const owner = await requireOwnerProfile(authorizationHeader);
      const payload = await buildAnalyticsPayload(owner.uid, args);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload),
          },
        ],
      };
    },
  );

  server.registerTool(
    'get_today_sales',
    {
      title: 'Get today sales',
      description: 'Read-only sales report for today in the business timezone.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
      },
    },
    async () => {
      const owner = await requireOwnerProfile(authorizationHeader);
      const payload = await buildAnalyticsPayload(owner.uid, { scope: 'sales' });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload),
          },
        ],
      };
    },
  );

  server.registerTool(
    'get_year_sales_report',
    {
      title: 'Get year sales report',
      description: 'Read-only sales report for a calendar year.',
      inputSchema: {
        year: z.number().int().min(2000).max(2100).describe('Calendar year.'),
      },
      annotations: {
        readOnlyHint: true,
      },
    },
    async ({ year }) => {
      const owner = await requireOwnerProfile(authorizationHeader);
      const payload = await buildAnalyticsPayload(owner.uid, { scope: 'sales', year });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload),
          },
        ],
      };
    },
  );

  server.registerTool(
    'get_inventory_summary',
    {
      title: 'Get inventory summary',
      description: 'Read-only stock, low stock, out-of-stock, and inventory value summary.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
      },
    },
    async () => {
      const owner = await requireOwnerProfile(authorizationHeader);
      const payload = await buildAnalyticsPayload(owner.uid, { scope: 'inventory' });
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload),
          },
        ],
      };
    },
  );

  return server;
};

export const api = onRequest(
  {
    region: 'asia-south1',
    secrets: [OPENAI_API_KEY],
  },
  async (request, response) => {
    response.set('Access-Control-Allow-Origin', request.headers.origin || '*');
    response.set('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (request.method === 'OPTIONS') {
      response.status(204).send('');
      return;
    }

    try {
      const pathname = request.path.replace(/^\/api/, '') || request.path;

      if (pathname === '/health') {
        json(response, 200, { ok: true });
        return;
      }

      if (pathname === '/mcp') {
        const server = createMcpServer(request.headers.authorization);
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
        });

        response.on('close', () => {
          void transport.close();
          void server.close();
        });

        await server.connect(transport);
        await transport.handleRequest(request, response, request.body);
        return;
      }

      if (pathname === '/chatkit/session') {
        if (request.method !== 'POST') {
          json(response, 405, { error: 'Method not allowed.' });
          return;
        }

        const owner = await requireOwnerProfile(request.headers.authorization);
        const workflowId = OPENAI_WORKFLOW_ID.value() || process.env.OPENAI_WORKFLOW_ID;
        const apiKey = OPENAI_API_KEY.value() || process.env.OPENAI_API_KEY;

        if (!workflowId || !apiKey) {
          json(response, 503, {
            error: 'Copilot is not configured yet.',
            missing: {
              openaiWorkflowId: !workflowId,
              openaiApiKey: !apiKey,
            },
          });
          return;
        }

        const openaiResponse = await fetch('https://api.openai.com/v1/chatkit/sessions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'OpenAI-Beta': 'chatkit_beta=v1',
          },
          body: JSON.stringify({
            workflow: { id: workflowId },
            user: owner.uid,
          }),
        });

        const payload = await openaiResponse.json();
        if (!openaiResponse.ok) {
          json(response, openaiResponse.status, {
            error: 'Unable to create a ChatKit session.',
            details: payload,
          });
          return;
        }

        json(response, 200, {
          client_secret: payload.client_secret,
        });
        return;
      }

      if (pathname === '/copilot/analytics') {
        if (request.method !== 'POST') {
          json(response, 405, { error: 'Method not allowed.' });
          return;
        }

        const owner = await requireOwnerProfile(request.headers.authorization);
        const body = readJsonBody<{ scope?: AnalyticsScope; startDate?: string; endDate?: string; year?: number }>(request.body);
        const payload = await buildAnalyticsPayload(owner.uid, body);
        json(response, 200, payload);
        return;
      }

      json(response, 404, { error: 'API route not found.' });
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'MISSING_AUTH_TOKEN') {
          json(response, 401, { error: 'Sign in before using the business copilot.' });
          return;
        }
        if (error.message === 'PROFILE_NOT_FOUND') {
          json(response, 404, { error: 'Business profile not found.' });
          return;
        }
        if (error.message === 'OWNER_ONLY') {
          json(response, 403, { error: 'Only the business owner can use the business copilot.' });
          return;
        }
      }

      console.error(error);
      json(response, 500, { error: 'Business copilot backend failed.' });
    }
  },
);
