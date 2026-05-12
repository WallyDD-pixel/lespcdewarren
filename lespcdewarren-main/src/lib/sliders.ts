import { prisma } from "./prisma";

export type SliderItem = {
  id: number;
  title: string;
  subtitle?: string | null;
  image: string;
  align?: "left" | "center" | "right" | null;
  position?: string | null;
  cta?: { label: string; href: string }[] | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

function toBool(n: any): boolean { return n === 1 || n === true || String(n) === "1"; }

async function ensureTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS Slider (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      subtitle TEXT,
      image TEXT NOT NULL,
      align TEXT DEFAULT 'left',
      position TEXT,
      cta TEXT,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      isActive INTEGER NOT NULL DEFAULT 1,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  // Index pour tri
  await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS idx_slider_sort ON Slider(sortOrder, id)`);
}

function normalizeAlign(a?: string | null): "left" | "center" | "right" | null {
  if (!a) return null;
  const v = String(a).toLowerCase();
  return v === "center" ? "center" : v === "right" ? "right" : "left";
}

export async function listPublicSliders(): Promise<SliderItem[]> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM Slider WHERE isActive = 1 ORDER BY sortOrder ASC, id ASC`);
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? null,
    image: r.image,
    align: normalizeAlign(r.align),
    position: r.position ?? null,
    cta: r.cta ? JSON.parse(r.cta) : null,
    sortOrder: Number(r.sortOrder ?? 0),
    isActive: toBool(r.isActive),
    createdAt: String(r.createdAt),
    updatedAt: String(r.updatedAt),
  }));
}

export async function listAdminSliders(): Promise<SliderItem[]> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT * FROM Slider ORDER BY sortOrder ASC, id ASC`);
  return rows.map(r => ({
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? null,
    image: r.image,
    align: normalizeAlign(r.align),
    position: r.position ?? null,
    cta: r.cta ? JSON.parse(r.cta) : null,
    sortOrder: Number(r.sortOrder ?? 0),
    isActive: toBool(r.isActive),
    createdAt: String(r.createdAt),
    updatedAt: String(r.updatedAt),
  }));
}

export async function getMaxSortOrder(): Promise<number> {
  await ensureTable();
  const rows = await prisma.$queryRawUnsafe<any[]>(`SELECT MAX(sortOrder) as m FROM Slider`);
  const m = rows?.[0]?.m;
  return Number.isFinite(Number(m)) ? Number(m) : 0;
}

export async function createSlider(data: Partial<SliderItem>): Promise<number> {
  await ensureTable();
  const sortOrder = Number.isFinite(Number(data.sortOrder)) ? Number(data.sortOrder) : (await getMaxSortOrder()) + 1;
  const isActive = data.isActive !== false;
  const align = normalizeAlign((data.align as any) ?? "left") ?? "left";
  const cta = data.cta && Array.isArray(data.cta) ? JSON.stringify(data.cta) : null;
  await prisma.$executeRawUnsafe(
    `INSERT INTO Slider (title, subtitle, image, align, position, cta, sortOrder, isActive, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    data.title || "",
    data.subtitle ?? null,
    data.image || "",
    align,
    data.position ?? null,
    cta,
    sortOrder,
    isActive ? 1 : 0,
  );
  const row = await prisma.$queryRawUnsafe<any[]>(`SELECT id FROM Slider ORDER BY id DESC LIMIT 1`);
  return Number(row?.[0]?.id ?? 0);
}

export async function updateSlider(id: number, data: Partial<SliderItem>): Promise<void> {
  await ensureTable();
  // Build dynamic set
  const fields: string[] = [];
  const params: any[] = [];
  if (data.title !== undefined) { fields.push("title = ?"); params.push(data.title); }
  if (data.subtitle !== undefined) { fields.push("subtitle = ?"); params.push(data.subtitle ?? null); }
  if (data.image !== undefined) { fields.push("image = ?"); params.push(data.image); }
  if (data.align !== undefined) { fields.push("align = ?"); params.push(normalizeAlign(data.align as any) ?? "left"); }
  if (data.position !== undefined) { fields.push("position = ?"); params.push(data.position ?? null); }
  if (data.cta !== undefined) { fields.push("cta = ?"); params.push(data.cta ? JSON.stringify(data.cta) : null); }
  if (data.sortOrder !== undefined) { fields.push("sortOrder = ?"); params.push(Number(data.sortOrder || 0)); }
  if (data.isActive !== undefined) { fields.push("isActive = ?"); params.push(data.isActive ? 1 : 0); }
  fields.push("updatedAt = CURRENT_TIMESTAMP");
  const sql = `UPDATE Slider SET ${fields.join(", ")} WHERE id = ?`;
  params.push(id);
  await prisma.$executeRawUnsafe(sql, ...params);
}

export async function deleteSlider(id: number): Promise<void> {
  await ensureTable();
  await prisma.$executeRawUnsafe(`DELETE FROM Slider WHERE id = ?`, id);
}
