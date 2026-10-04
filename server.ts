import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Persistent store file path for live published data
const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'officers.json');
const SRC_DATA_FILE = path.resolve(__dirname, 'src', 'data', 'latestPersonnel.json');
const NATIONAL_DATA_FILE = path.join(DATA_DIR, 'national_police.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Helper to read current published roster
function getPublishedOfficers() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
    if (fs.existsSync(SRC_DATA_FILE)) {
      const data = fs.readFileSync(SRC_DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed reading published officers:', err);
  }
  return null;
}

// API Routes
app.get('/api/officers', (req, res) => {
  const published = getPublishedOfficers();
  if (published && Array.isArray(published)) {
    return res.json({
      success: true,
      count: published.length,
      data: published,
      source: 'published_live_store',
      updatedAt: fs.existsSync(DATA_FILE) ? fs.statSync(DATA_FILE).mtime : new Date(),
    });
  }
  return res.json({
    success: true,
    count: 0,
    data: [],
    source: 'initial_default',
  });
});

app.post('/api/officers', (req, res) => {
  try {
    const { officers, publishedBy } = req.body;
    if (!Array.isArray(officers)) {
      return res.status(400).json({ success: false, error: 'ข้อมูลกำลังพลต้องเป็น Array' });
    }

    const payload = JSON.stringify(officers, null, 2);

    // Save to persistent json file in data/
    fs.writeFileSync(DATA_FILE, payload, 'utf8');

    // Also backup to src/data/latestPersonnel.json
    try {
      const srcDir = path.resolve(__dirname, 'src', 'data');
      if (fs.existsSync(srcDir)) {
        fs.writeFileSync(SRC_DATA_FILE, payload, 'utf8');
      }
    } catch (e) {
      console.warn('Could not write backup to src/data:', e);
    }

    console.log(`[LIVE PUBLISH] Successfully published ${officers.length} officers to live website.`);

    return res.json({
      success: true,
      message: officers.length === 0
        ? 'ลบและอัปเดตระบบให้เป็น 0 อัตรา เรียบร้อยแล้ว'
        : `บันทึกและเผยแพร่ข้อมูลกำลังพลล่าสุด ${officers.length} อัตรา ลงเว็บไซต์เรียบร้อยแล้ว`,
      count: officers.length,
      publishedAt: new Date().toISOString(),
      publishedBy: publishedBy || 'ผู้ดูแลระบบ สกพ.',
    });
  } catch (err: any) {
    console.error('Error saving officers file:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/officers/clear-occupants', (req, res) => {
  try {
    const published = getPublishedOfficers() || [];
    const updated = published.map((o: any) => ({
      ...o,
      isVacant: true,
      rank: '-',
      firstName: '',
      lastName: '',
      gender: '-',
      updatedAt: new Date().toISOString(),
    }));
    const payload = JSON.stringify(updated, null, 2);
    fs.writeFileSync(DATA_FILE, payload, 'utf8');
    try {
      const srcDir = path.resolve(__dirname, 'src', 'data');
      if (fs.existsSync(srcDir)) {
        fs.writeFileSync(SRC_DATA_FILE, payload, 'utf8');
      }
    } catch (e) {
      console.warn('Could not write backup to src/data:', e);
    }
    console.log(`[CLEAR OCCUPANTS] Cleared all occupants. All ${updated.length} positions are now vacant.`);
    return res.json({
      success: true,
      message: `ลบข้อมูลคนครองออกทั้งหมดเรียบร้อยแล้ว (ปรับเป็นตำแหน่งว่างทั้งหมด ${updated.length} อัตรา)`,
      count: updated.length,
      data: updated,
    });
  } catch (err: any) {
    console.error('Error clearing occupants:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/officers/delete-occupied', (req, res) => {
  try {
    const published = getPublishedOfficers() || [];
    const updated = published.filter((o: any) => o.isVacant);
    const payload = JSON.stringify(updated, null, 2);
    fs.writeFileSync(DATA_FILE, payload, 'utf8');
    try {
      const srcDir = path.resolve(__dirname, 'src', 'data');
      if (fs.existsSync(srcDir)) {
        fs.writeFileSync(SRC_DATA_FILE, payload, 'utf8');
      }
    } catch (e) {
      console.warn('Could not write backup to src/data:', e);
    }
    console.log(`[DELETE OCCUPIED] Deleted occupied positions. Remaining vacant: ${updated.length}.`);
    return res.json({
      success: true,
      message: `ลบอัตราที่มีคนครองออกทั้งหมดเรียบร้อยแล้ว (เหลือตำแหน่งว่าง ${updated.length} อัตรา)`,
      count: updated.length,
      data: updated,
    });
  } catch (err: any) {
    console.error('Error deleting occupied positions:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/officers/clear', (req, res) => {
  try {
    const payload = JSON.stringify([], null, 2);
    fs.writeFileSync(DATA_FILE, payload, 'utf8');
    try {
      const srcDir = path.resolve(__dirname, 'src', 'data');
      if (fs.existsSync(srcDir)) {
        fs.writeFileSync(SRC_DATA_FILE, payload, 'utf8');
      }
    } catch (e) {
      console.warn('Could not write backup to src/data:', e);
    }
    console.log('[CLEAR] Successfully cleared all officers (0 count).');
    return res.json({
      success: true,
      message: 'ลบอัตราข้อมูลทั้งหมดในระบบเรียบร้อยแล้ว (0 อัตรา)',
      count: 0,
      clearedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error clearing officers:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/officers/reset', (req, res) => {
  try {
    const payload = JSON.stringify([], null, 2);
    fs.writeFileSync(DATA_FILE, payload, 'utf8');
    try {
      const srcDir = path.resolve(__dirname, 'src', 'data');
      if (fs.existsSync(srcDir)) {
        fs.writeFileSync(SRC_DATA_FILE, payload, 'utf8');
      }
    } catch (e) {}
    console.log('[RESET] Reset published officers back to initial default (0 rates).');
    return res.json({
      success: true,
      message: 'คืนค่าข้อมูลทำเนียบกำลังพลเริ่มต้นเป็น 0 อัตรา เรียบร้อยแล้ว',
      count: 0,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

// National Police Manpower Status Endpoints
app.get('/api/national-police', (req, res) => {
  try {
    if (fs.existsSync(NATIONAL_DATA_FILE)) {
      const data = fs.readFileSync(NATIONAL_DATA_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return res.json({
          success: true,
          count: parsed.length,
          data: parsed,
          updatedAt: fs.statSync(NATIONAL_DATA_FILE).mtime,
        });
      }
    }
  } catch (err) {
    console.error('Failed reading national police file:', err);
  }
  return res.json({
    success: false,
    count: 0,
    data: [],
  });
});

app.post('/api/national-police', (req, res) => {
  try {
    const { rows } = req.body;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ success: false, error: 'ข้อมูลต้องเป็น Array' });
    }
    const payload = JSON.stringify(rows, null, 2);
    fs.writeFileSync(NATIONAL_DATA_FILE, payload, 'utf8');
    return res.json({
      success: true,
      count: rows.length,
      message: `บันทึกข้อมูลสถานภาพกำลังพลตำรวจทั้งประเทศ ${rows.length} รายการ เรียบร้อย`,
      updatedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error saving national police file:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

// Vite middleware in dev or static serving in production
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`[POLICE DIRECTORY] Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
