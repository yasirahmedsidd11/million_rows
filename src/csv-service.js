const fs = require('fs');
const { parse } = require('csv-parse');
const config = require('./config');

function rowMatches(row, query) {
  const needle = query.toLowerCase();
  return Object.values(row).some((value) =>
    String(value).toLowerCase().includes(needle)
  );
}

function normalizeRow(row) {
  return {
    shipping_id: row.shipping_id,
    company_name: row.company_name,
    product_category: row.product_category,
    weight: Number(row.weight),
    route: row.route,
    date: row.date,
    status: row.status,
  };
}

async function queryRows({ page, pageSize, q }) {
  if (!fs.existsSync(config.csvPath)) {
    const error = new Error('CSV file not found. Run: npm run generate-csv');
    error.statusCode = 503;
    throw error;
  }

  const skip = (page - 1) * pageSize;
  const collected = [];
  let total = 0;

  const stream = fs.createReadStream(config.csvPath);
  const parser = parse({ columns: true, skip_empty_lines: true, trim: true });

  for await (const row of stream.pipe(parser)) {
    if (q && !rowMatches(row, q)) continue;

    if (total >= skip && collected.length < pageSize) {
      collected.push(normalizeRow(row));
    }

    total++;
  }

  return {
    data: collected,
    page,
    pageSize,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
  };
}

module.exports = { queryRows };
