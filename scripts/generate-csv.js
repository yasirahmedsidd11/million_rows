const fs = require('fs');
const path = require('path');

const TOTAL_ROWS = Number(process.env.TOTAL_ROWS) > 0 ? Number(process.env.TOTAL_ROWS) : 250_000;
const BATCH_SIZE = 10_000;
const OUTPUT_PATH =
  process.env.CSV_PATH && String(process.env.CSV_PATH).trim() !== ''
    ? path.resolve(process.env.CSV_PATH)
    : path.join(__dirname, '..', 'data', 'rows.csv');

const COMPANIES = [
  'Atlas Freight Co', 'Blue Harbor Logistics', 'Continental Cargo Ltd',
  'Delta Express Shipping', 'Eagle Ridge Transport', 'FastLane Global',
  'GreenRoute Carriers', 'Horizon Haulage', 'Ironclad Movers',
  'JetStream Logistics', 'Keystone Shipping', 'Lakeside Freight',
  'Meridian Transport', 'NorthStar Cargo', 'OceanLink Shipping',
  'Pacific Rim Logistics', 'Quantum Freight', 'Redwood Carriers',
  'Summit Express', 'Titan Haulage',
];

const PRODUCT_CATEGORIES = [
  'electronics', 'furniture', 'apparel', 'machinery', 'food_beverage',
  'pharmaceuticals', 'automotive_parts', 'chemicals', 'raw_materials',
  'consumer_goods', 'building_materials', 'paper_products', 'plastics',
  'metals', 'textiles', 'agricultural', 'medical_supplies', 'appliances',
  'packaging', 'industrial_equipment',
];

const ROUTES = [
  'New York → Chicago', 'Los Angeles → Dallas', 'Seattle → Denver',
  'Miami → Atlanta', 'Boston → Philadelphia', 'Houston → Phoenix',
  'San Francisco → Portland', 'Detroit → Minneapolis', 'Toronto → Montreal',
  'London → Paris', 'Berlin → Amsterdam', 'Tokyo → Osaka',
  'Sydney → Melbourne', 'Dubai → Mumbai', 'Singapore → Hong Kong',
  'Shanghai → Beijing', 'Mexico City → Guadalajara', 'São Paulo → Rio',
  'Madrid → Barcelona', 'Johannesburg → Cape Town',
];

const STATUSES = [
  'pending', 'in_transit', 'delivered', 'delayed', 'cancelled',
  'out_for_delivery', 'customs_hold', 'returned',
];

function escapeCsv(value) {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatRow(id) {
  const shippingId = `SHP-${String(id).padStart(6, '0')}`;
  const companyName = COMPANIES[id % COMPANIES.length];
  const productCategory = PRODUCT_CATEGORIES[id % PRODUCT_CATEGORIES.length];
  const weight = (((id * 13 + 7) % 50000) / 10 + 0.5).toFixed(1);
  const route = ROUTES[id % ROUTES.length];
  const daysAgo = id % 730;
  const date = new Date(Date.now() - daysAgo * 86400000).toISOString().slice(0, 10);
  const status = STATUSES[id % STATUSES.length];

  return [
    escapeCsv(shippingId),
    escapeCsv(companyName),
    escapeCsv(productCategory),
    weight,
    escapeCsv(route),
    date,
    escapeCsv(status),
  ].join(',');
}

function generate() {
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });

  const stream = fs.createWriteStream(OUTPUT_PATH, { encoding: 'utf8' });
  stream.write('shipping_id,company_name,product_category,weight,route,date,status\n');

  let written = 0;

  function writeBatch() {
    let batch = '';
    const end = Math.min(written + BATCH_SIZE, TOTAL_ROWS);

    for (let id = written + 1; id <= end; id++) {
      batch += formatRow(id) + '\n';
    }

    written = end;
    const canContinue = stream.write(batch);

    if (written % 100_000 === 0 || written === TOTAL_ROWS) {
      console.log(`Generated ${written.toLocaleString()} / ${TOTAL_ROWS.toLocaleString()} rows`);
    }

    if (written < TOTAL_ROWS) {
      if (canContinue) {
        writeBatch();
      } else {
        stream.once('drain', writeBatch);
      }
    } else {
      stream.end(() => {
        console.log(`Done. CSV written to ${OUTPUT_PATH}`);
      });
    }
  }

  console.log(`Generating ${TOTAL_ROWS.toLocaleString()} rows...`);
  writeBatch();
}

generate();
