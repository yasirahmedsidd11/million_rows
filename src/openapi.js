const SHIPMENT_STATUSES = [
  'pending',
  'in_transit',
  'delivered',
  'delayed',
  'cancelled',
  'out_for_delivery',
  'customs_hold',
  'returned',
];

const exampleShipment = {
  shipping_id: 'SHP-000001',
  company_name: 'Blue Harbor Logistics',
  product_category: 'furniture',
  weight: 2.5,
  route: 'Los Angeles → Dallas',
  date: '2026-05-21',
  status: 'in_transit',
};

const exampleStats = {
  total_shipments: 250000,
  pending: 42000,
  delivered: 156000,
  completed: 52000,
};

const exampleShippingData = {
  data: [exampleShipment],
  page: 1,
  pageSize: 1000,
  total: 250000,
  totalPages: 250,
};

const exampleRowsResponse = {
  stats: exampleStats,
  shipping_data: exampleShippingData,
};

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Shipping API - Documentation',
    version: '1.0.0',
    description:
      'Paginated, searchable Shipping API over a CSV of shipping records. ' +
      'Each `/api/rows` response includes fixed aggregate **stats** and paginated **shipping_data**. ' +
      'Records include shipping_id, company_name, product_category, weight, route, date, and status. ' +
      'No database — the file is scanned on each request.',
  },
  servers: [{ url: '/' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Returns service health status for load balancers and Docker.',
        tags: ['System'],
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HealthResponse' },
                example: { status: 'ok' },
              },
            },
          },
        },
      },
    },
    '/api/rows': {
      get: {
        summary: 'List shipping records with stats',
        description:
          'Returns fixed shipment statistics plus a paginated slice of shipping records from the CSV. ' +
          'Search (`q`) is case-insensitive and matches any field: shipping_id, company_name, ' +
          'product_category, weight, route, date, or status.',
        tags: ['Shipments'],
        parameters: [
          {
            name: 'page',
            in: 'query',
            description: 'Page number (1-based)',
            schema: { type: 'integer', minimum: 1, default: 1 },
            example: 1,
          },
          {
            name: 'pageSize',
            in: 'query',
            description: 'Number of records per page',
            schema: { type: 'integer', minimum: 1, maximum: 5000, default: 1000 },
            example: 100,
          },
          {
            name: 'q',
            in: 'query',
            description:
              'Optional search query (substring match on any column). Examples: `in_transit`, `Atlas`, `electronics`, `SHP-000042`',
            schema: { type: 'string' },
            examples: {
              status: { summary: 'By status', value: 'in_transit' },
              company: { summary: 'By company', value: 'Atlas' },
              category: { summary: 'By product category', value: 'electronics' },
              shippingId: { summary: 'By shipping ID', value: 'SHP-000001' },
            },
          },
        ],
        responses: {
          200: {
            description: 'Shipment stats and paginated shipping records',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/RowsResponse' },
                example: exampleRowsResponse,
              },
            },
          },
          400: {
            description: 'Invalid query parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { error: 'pageSize must not exceed 5000' },
              },
            },
          },
          503: {
            description: 'CSV file not available',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
                example: { error: 'CSV file not found. Run: npm run generate-csv' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ShipmentStats: {
        type: 'object',
        description: 'Fixed aggregate shipment statistics (not computed from the current page).',
        properties: {
          total_shipments: {
            type: 'integer',
            description: 'Total number of shipments',
            example: 250000,
          },
          pending: {
            type: 'integer',
            description: 'Shipments awaiting processing or pickup',
            example: 42000,
          },
          delivered: {
            type: 'integer',
            description: 'Shipments successfully delivered',
            example: 156000,
          },
          completed: {
            type: 'integer',
            description: 'Shipments fully completed (closed)',
            example: 52000,
          },
        },
        required: ['total_shipments', 'pending', 'delivered', 'completed'],
      },
      Shipment: {
        type: 'object',
        description: 'A single shipping record from the CSV dataset.',
        properties: {
          shipping_id: {
            type: 'string',
            description: 'Unique shipment identifier',
            example: 'SHP-000001',
          },
          company_name: {
            type: 'string',
            description: 'Freight or logistics company name',
            example: 'Atlas Freight Co',
          },
          product_category: {
            type: 'string',
            description: 'Category of goods being shipped',
            example: 'electronics',
          },
          weight: {
            type: 'number',
            format: 'float',
            description: 'Shipment weight in kilograms',
            example: 42.5,
          },
          route: {
            type: 'string',
            description: 'Origin → destination route',
            example: 'New York → Chicago',
          },
          date: {
            type: 'string',
            format: 'date',
            description: 'Shipment date (YYYY-MM-DD)',
            example: '2026-05-21',
          },
          status: {
            type: 'string',
            description: 'Current shipment status',
            enum: SHIPMENT_STATUSES,
            example: 'in_transit',
          },
        },
        required: [
          'shipping_id',
          'company_name',
          'product_category',
          'weight',
          'route',
          'date',
          'status',
        ],
      },
      ShippingData: {
        type: 'object',
        description: 'Paginated list of shipping records with metadata.',
        properties: {
          data: {
            type: 'array',
            description: 'Shipping records for the requested page',
            items: { $ref: '#/components/schemas/Shipment' },
          },
          page: { type: 'integer', description: 'Current page (1-based)', example: 1 },
          pageSize: {
            type: 'integer',
            description: 'Records per page',
            example: 1000,
          },
          total: {
            type: 'integer',
            description: 'Total matching records (after search filter, if any)',
            example: 250000,
          },
          totalPages: {
            type: 'integer',
            description: 'Total pages for the current pageSize and filter',
            example: 250,
          },
        },
        required: ['data', 'page', 'pageSize', 'total', 'totalPages'],
      },
      RowsResponse: {
        type: 'object',
        description: 'Shipment statistics plus paginated shipping records.',
        properties: {
          stats: { $ref: '#/components/schemas/ShipmentStats' },
          shipping_data: { $ref: '#/components/schemas/ShippingData' },
        },
        required: ['stats', 'shipping_data'],
      },
      HealthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', example: 'ok' },
        },
        required: ['status'],
      },
      ErrorResponse: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
        required: ['error'],
      },
    },
  },
};
