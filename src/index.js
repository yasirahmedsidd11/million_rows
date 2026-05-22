const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const { queryRows } = require('./csv-service');
const openApiSpec = require('./openapi');
const stats = require('./stats');

const app = express();

app.use(cors());

app.use(
  '/api-docs',
  swaggerUi.serve,
  swaggerUi.setup(openApiSpec, {
    explorer: true,
    persistAuthorization: false,
    customSiteTitle: 'Shipping API - Documentation',
  })
);
app.get('/api-docs.json', (_req, res) => res.json(openApiSpec));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

function parsePositiveInt(value, name) {
  if (value === undefined || value === '') return undefined;
  const num = Number(value);
  if (!Number.isInteger(num) || num < 1) {
    const error = new Error(`${name} must be a positive integer`);
    error.statusCode = 400;
    throw error;
  }
  return num;
}

// Returns fixed stats plus paginated shipping_data (see /api-docs for schema).
app.get('/api/rows', async (req, res, next) => {
  try {
    const page = parsePositiveInt(req.query.page, 'page') ?? 1;
    const pageSize =
      parsePositiveInt(req.query.pageSize, 'pageSize') ?? config.defaultPageSize;

    if (pageSize > config.maxPageSize) {
      return res.status(400).json({
        error: `pageSize must not exceed ${config.maxPageSize}`,
      });
    }

    const q = req.query.q?.trim() || undefined;
    const shipping_data = await queryRows({ page, pageSize, q });
    res.json({ stats, shipping_data });
  } catch (err) {
    next(err);
  }
});

app.use((err, _req, res, _next) => {
  const status = err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
});

const server = app.listen(config.port, () => {
  console.log(`Server listening on http://localhost:${config.port}`);
  console.log(`Swagger UI: http://localhost:${config.port}/api-docs`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
