const path = require('path');

module.exports = {
  port: Number(process.env.PORT) || 8578,
  csvPath: process.env.CSV_PATH || path.join(__dirname, '..', 'data', 'rows.csv'),
  defaultPageSize: Number(process.env.DEFAULT_PAGE_SIZE) || 1000,
  maxPageSize: Number(process.env.MAX_PAGE_SIZE) || 5000,
};
