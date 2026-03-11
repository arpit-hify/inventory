import { google } from 'googleapis';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID!;
const INVENTORY_SHEET = 'Raspberry Pi Inventory in office';
const PIES_SHEET = 'Pi Builds';
const LOGS_SHEET = 'Transaction Logs';

function getAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return auth;
}

export async function getSheets() {
  const auth = getAuth();
  return google.sheets({ version: 'v4', auth });
}

export interface InventoryItem {
  id: string;
  asset: string;
  brand: string;
  vendor: string;
  totalPurchased: number;
  qtyReturned: number;
  oldStock: number;
  qtyIn: number;
  qtyOut: number;
  qtyReturnedVendor: number;
  qtyInOffice: number;
  row: number;
}

export interface PiBuild {
  id: string;
  name: string;
  qrCode: string;
  ssd?: string;
  hat?: string;
  cooler?: string;
  sdCard?: string;
  powerCable?: string;
  metalCase?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  row: number;
}

export interface TransactionLog {
  id: string;
  timestamp: string;
  action: string;
  asset: string;
  qty: number;
  performedBy: string;
  notes: string;
  piName?: string;
}

export async function getInventory(): Promise<InventoryItem[]> {
  const sheets = await getSheets();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${INVENTORY_SHEET}'!A2:J100`,
  });
  const rows = res.data.values || [];
  return rows
    .filter(row => row[0])
    .map((row, i) => ({
      id: `inv-${i}`,
      asset: row[0] || '',
      brand: row[1] || '',
      vendor: row[2] || '',
      totalPurchased: parseInt(row[3]) || 0,
      qtyReturned: parseInt(row[4]) || 0,
      oldStock: parseInt(row[5]) || 0,
      qtyIn: parseInt(row[6]) || 0,
      qtyOut: parseInt(row[7]) || 0,
      qtyReturnedVendor: parseInt(row[8]) || 0,
      qtyInOffice: parseInt(row[9]) || 0,
      row: i + 2,
    }));
}

export async function updateInventoryItem(item: InventoryItem): Promise<void> {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${INVENTORY_SHEET}'!A${item.row}:J${item.row}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        item.asset, item.brand, item.vendor,
        item.totalPurchased, item.qtyReturned, item.oldStock,
        item.qtyIn, item.qtyOut, item.qtyReturnedVendor, item.qtyInOffice
      ]]
    }
  });
}

export async function addInventoryItem(item: Omit<InventoryItem, 'id' | 'row'>): Promise<void> {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${INVENTORY_SHEET}'!A:J`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        item.asset, item.brand, item.vendor,
        item.totalPurchased, item.qtyReturned, item.oldStock,
        item.qtyIn, item.qtyOut, item.qtyReturnedVendor, item.qtyInOffice
      ]]
    }
  });
}

export async function deleteInventoryRow(row: number): Promise<void> {
  const sheets = await getSheets();
  // Clear the row
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${INVENTORY_SHEET}'!A${row}:J${row}`,
  });
}

// Pi Builds sheet helpers
async function ensurePiBuildSheet(sheets: ReturnType<typeof google.sheets>) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets?.some(s => s.properties?.title === PIES_SHEET);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: PIES_SHEET } } }]
      }
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${PIES_SHEET}'!A1:L1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['ID', 'Name', 'QR Code', 'SSD', 'HAT', 'Cooler', 'SD Card', 'Power Cable', 'Metal Case', 'Notes', 'Created At', 'Updated At']]
      }
    });
  }
}

async function ensureLogsSheet(sheets: ReturnType<typeof google.sheets>) {
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const exists = meta.data.sheets?.some(s => s.properties?.title === LOGS_SHEET);
  if (!exists) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [{ addSheet: { properties: { title: LOGS_SHEET } } }]
      }
    });
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${LOGS_SHEET}'!A1:G1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [['ID', 'Timestamp', 'Action', 'Asset', 'Qty', 'Performed By', 'Notes', 'Pi Name']]
      }
    });
  }
}

export async function getPiBuilds(): Promise<PiBuild[]> {
  const sheets = await getSheets();
  await ensurePiBuildSheet(sheets);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${PIES_SHEET}'!A2:L500`,
  });
  const rows = res.data.values || [];
  return rows.filter(row => row[0]).map((row, i) => ({
    id: row[0],
    name: row[1] || '',
    qrCode: row[2] || '',
    ssd: row[3] || '',
    hat: row[4] || '',
    cooler: row[5] || '',
    sdCard: row[6] || '',
    powerCable: row[7] || '',
    metalCase: row[8] || '',
    notes: row[9] || '',
    createdAt: row[10] || '',
    updatedAt: row[11] || '',
    row: i + 2,
  }));
}

export async function addPiBuild(pi: Omit<PiBuild, 'row'>): Promise<void> {
  const sheets = await getSheets();
  await ensurePiBuildSheet(sheets);
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${PIES_SHEET}'!A:L`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        pi.id, pi.name, pi.qrCode, pi.ssd || '', pi.hat || '',
        pi.cooler || '', pi.sdCard || '', pi.powerCable || '',
        pi.metalCase || '', pi.notes || '', pi.createdAt, pi.updatedAt
      ]]
    }
  });
}

export async function updatePiBuild(pi: PiBuild): Promise<void> {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${PIES_SHEET}'!A${pi.row}:L${pi.row}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        pi.id, pi.name, pi.qrCode, pi.ssd || '', pi.hat || '',
        pi.cooler || '', pi.sdCard || '', pi.powerCable || '',
        pi.metalCase || '', pi.notes || '', pi.createdAt, pi.updatedAt
      ]]
    }
  });
}

export async function deletePiBuild(row: number): Promise<void> {
  const sheets = await getSheets();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${PIES_SHEET}'!A${row}:L${row}`,
  });
}

export async function getLogs(): Promise<TransactionLog[]> {
  const sheets = await getSheets();
  await ensureLogsSheet(sheets);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${LOGS_SHEET}'!A2:H1000`,
  });
  const rows = res.data.values || [];
  return rows.filter(row => row[0]).map(row => ({
    id: row[0],
    timestamp: row[1] || '',
    action: row[2] || '',
    asset: row[3] || '',
    qty: parseInt(row[4]) || 0,
    performedBy: row[5] || '',
    notes: row[6] || '',
    piName: row[7] || '',
  })).reverse();
}

export async function addLog(log: Omit<TransactionLog, 'id'>): Promise<void> {
  const sheets = await getSheets();
  await ensureLogsSheet(sheets);
  const id = `log-${Date.now()}`;
  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${LOGS_SHEET}'!A:H`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        id, log.timestamp, log.action, log.asset,
        log.qty, log.performedBy, log.notes, log.piName || ''
      ]]
    }
  });
}
