import fs from 'fs';

const companies = [
  "PT Telekomunikasi Selular", "PT Aplikanusa Lintasarta", "PT Huawei Tech Investment", 
  "PT ZTE Indonesia", "PT Indosat Tbk", "PT XL Axiata Tbk", "PT Smartfren Telecom Tbk", 
  "Nokia Solutions and Networks", "Ericsson Indonesia", "PT Fiber Networks Indonesia",
  "PT Sarana Menara Nusantara", "PT Profesional Telekomunikasi Indonesia", "PT Tower Bersama Infrastructure",
  "PT Centratama Telekomunikasi", "PT Solusi Tunas Pratama"
];

const projectNames = [
  "Penggelaran Fiber Optik Regional Jabar", "Pemeliharaan BTS Area 2", 
  "Modernisasi Jaringan 5G Jakarta", "Instalasi Perangkat Transmisi Sumatera",
  "Managed Services Jaringan Core Telkomsel", "Pembangunan Data Center Cikarang",
  "Optimalisasi Radio Network Area 3", "Integrasi Sistem BSS/OSS",
  "Pengadaan Perangkat Router & Switch", "Upgrade Kapasitas Backbone Jawa-Bali"
];

const statuses = ["Ongoing", "Completed", "Delayed", "On Hold"];

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

let sql = `-- TIFA AI Dummy Database Seed
-- Generated on ${new Date().toISOString()}

`;

// 1. PROJECTS
sql += `
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  client VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  progress INT NOT NULL,
  status VARCHAR(50) NOT NULL
);

`;

const projects = [];
for(let i=1; i<=150; i++) {
  const pId = `PRJ-202${randomInt(4, 6)}-${String(i).padStart(3, '0')}`;
  const start = randomDate(new Date(2024, 0, 1), new Date(2025, 6, 1));
  const end = randomDate(new Date(2025, 6, 2), new Date(2027, 11, 31));
  
  projects.push({
    id: pId,
    name: projectNames[randomInt(0, projectNames.length - 1)] + " " + String(i).padStart(2, '0'),
    client: companies[randomInt(0, companies.length - 1)],
    start_date: formatDate(start),
    end_date: formatDate(end),
    progress: randomInt(0, 100),
    status: statuses[randomInt(0, statuses.length - 1)]
  });
}

// 2. CONTRACTS
sql += `
CREATE TABLE IF NOT EXISTS contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id VARCHAR(50) UNIQUE NOT NULL,
  project_id VARCHAR(50) REFERENCES projects(project_id),
  vendor_client VARCHAR(255) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  value BIGINT NOT NULL,
  status VARCHAR(50) NOT NULL
);

`;

const contracts = [];
const contractStatuses = ["Active", "Expired", "Renewed", "Terminated"];
for(let i=1; i<=300; i++) {
  const cId = `CTR-${randomInt(1000, 9999)}`;
  const p = projects[randomInt(0, projects.length - 1)];
  
  contracts.push({
    id: cId,
    project_id: p.id,
    vendor_client: p.client,
    start_date: p.start_date,
    end_date: p.end_date,
    value: randomInt(5, 500) * 10000000, // 50M to 5B
    status: contractStatuses[randomInt(0, contractStatuses.length - 1)]
  });
}

// 3. PURCHASE ORDERS
sql += `
CREATE TABLE IF NOT EXISTS purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number VARCHAR(50) UNIQUE NOT NULL,
  contract_id VARCHAR(50) REFERENCES contracts(contract_id),
  vendor VARCHAR(255) NOT NULL,
  po_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount BIGINT NOT NULL,
  status VARCHAR(50) NOT NULL
);

`;

const pos = [];
const poStatuses = ["Outstanding", "Paid", "Cancelled", "In Review"];
for(let i=1; i<=800; i++) {
  const poNum = `PO-${randomInt(2024, 2026)}-${String(i).padStart(4, '0')}`;
  const c = contracts[randomInt(0, contracts.length - 1)];
  const poDate = randomDate(new Date(c.start_date), new Date(c.end_date));
  const dueDate = new Date(poDate);
  dueDate.setDate(dueDate.getDate() + 30);
  
  pos.push({
    id: poNum,
    contract_id: c.id,
    vendor: c.vendor_client,
    po_date: formatDate(poDate),
    due_date: formatDate(dueDate),
    amount: Math.floor(c.value / randomInt(2, 10)),
    status: poStatuses[randomInt(0, poStatuses.length - 1)]
  });
}

// 4. SALES ORDERS
sql += `
CREATE TABLE IF NOT EXISTS sales_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  so_number VARCHAR(50) UNIQUE NOT NULL,
  project_id VARCHAR(50) REFERENCES projects(project_id),
  client VARCHAR(255) NOT NULL,
  so_date DATE NOT NULL,
  amount BIGINT NOT NULL,
  status VARCHAR(50) NOT NULL
);

`;

const sos = [];
const soStatuses = ["Draft", "Approved", "Invoiced", "Closed"];
for(let i=1; i<=800; i++) {
  const soNum = `SO-${randomInt(2024, 2026)}-${String(i).padStart(4, '0')}`;
  const p = projects[randomInt(0, projects.length - 1)];
  const soDate = randomDate(new Date(p.start_date), new Date(p.end_date));
  
  sos.push({
    id: soNum,
    project_id: p.id,
    client: p.client,
    so_date: formatDate(soDate),
    amount: randomInt(1, 100) * 50000000,
    status: soStatuses[randomInt(0, soStatuses.length - 1)]
  });
}

// 5. INVOICES
sql += `
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  ref_number VARCHAR(50) NOT NULL,
  ref_type VARCHAR(10) NOT NULL,
  client_vendor VARCHAR(255) NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount BIGINT NOT NULL,
  status VARCHAR(50) NOT NULL
);

`;

const invoices = [];
const invStatuses = ["Unpaid", "Paid", "Overdue"];
for(let i=1; i<=1200; i++) {
  const invNum = `INV-${randomInt(2024, 2026)}-${String(i).padStart(5, '0')}`;
  const isPo = Math.random() > 0.5;
  const ref = isPo ? pos[randomInt(0, pos.length - 1)] : sos[randomInt(0, sos.length - 1)];
  
  const invDate = new Date(isPo ? ref.po_date : ref.so_date);
  invDate.setDate(invDate.getDate() + randomInt(5, 15));
  const dueDate = new Date(invDate);
  dueDate.setDate(dueDate.getDate() + 30);
  
  invoices.push({
    id: invNum,
    ref_number: ref.id,
    ref_type: isPo ? 'PO' : 'SO',
    client_vendor: isPo ? ref.vendor : ref.client,
    invoice_date: formatDate(invDate),
    due_date: formatDate(dueDate),
    amount: ref.amount,
    status: invStatuses[randomInt(0, invStatuses.length - 1)]
  });
}

// 6. CASH IN
sql += `
CREATE TABLE IF NOT EXISTS cash_in (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id VARCHAR(50) UNIQUE NOT NULL,
  invoice_number VARCHAR(50) REFERENCES invoices(invoice_number),
  client VARCHAR(255) NOT NULL,
  payment_date DATE NOT NULL,
  amount BIGINT NOT NULL
);

`;

const cashins = [];
const paidInvoices = invoices.filter(i => i.status === 'Paid' && i.ref_type === 'SO');
for(let i=0; i<paidInvoices.length; i++) {
  const inv = paidInvoices[i];
  const trId = `TRX-IN-${randomInt(100000, 999999)}`;
  
  const payDate = new Date(inv.invoice_date);
  payDate.setDate(payDate.getDate() + randomInt(1, 45));
  
  cashins.push({
    id: trId,
    invoice_number: inv.id,
    client: inv.client_vendor,
    payment_date: formatDate(payDate),
    amount: inv.amount
  });
}

// GEN INSERTS
function generateInserts(tableName, dataArray) {
  let res = "-- INSERT " + tableName + "\\n";
  const chunks = [];
  const chunkSize = 100;
  for (let i = 0; i < dataArray.length; i += chunkSize) {
    chunks.push(dataArray.slice(i, i + chunkSize));
  }
  
  for (const chunk of chunks) {
    res += "INSERT INTO " + tableName + " (" + Object.keys(chunk[0]).join(', ') + ") VALUES \\n";
    const rows = chunk.map(row => {
      const vals = Object.values(row).map(v => typeof v === 'string' ? "'" + v + "'" : v);
      return "(" + vals.join(', ') + ")";
    });
    res += rows.join(',\\n') + " ON CONFLICT DO NOTHING;\\n\\n";
  }
  return res;
}

sql += generateInserts('projects', projects.map(p => ({
  project_id: p.id, name: p.name, client: p.client, start_date: p.start_date, end_date: p.end_date, progress: p.progress, status: p.status
})));

sql += generateInserts('contracts', contracts.map(c => ({
  contract_id: c.id, project_id: c.project_id, vendor_client: c.vendor_client, start_date: c.start_date, end_date: c.end_date, value: c.value, status: c.status
})));

sql += generateInserts('purchase_orders', pos.map(p => ({
  po_number: p.id, contract_id: p.contract_id, vendor: p.vendor, po_date: p.po_date, due_date: p.due_date, amount: p.amount, status: p.status
})));

sql += generateInserts('sales_orders', sos.map(s => ({
  so_number: s.id, project_id: s.project_id, client: s.client, so_date: s.so_date, amount: s.amount, status: s.status
})));

sql += generateInserts('invoices', invoices.map(i => ({
  invoice_number: i.id, ref_number: i.ref_number, ref_type: i.ref_type, client_vendor: i.client_vendor, invoice_date: i.invoice_date, due_date: i.due_date, amount: i.amount, status: i.status
})));

sql += generateInserts('cash_in', cashins.map(c => ({
  transaction_id: c.id, invoice_number: c.invoice_number, client: c.client, payment_date: c.payment_date, amount: c.amount
})));

fs.writeFileSync('seed_database.sql', sql);
console.log('Successfully generated seed_database.sql with ' + 
  (projects.length + contracts.length + pos.length + sos.length + invoices.length + cashins.length) + 
  ' records.');
