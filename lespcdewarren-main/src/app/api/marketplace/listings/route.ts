import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { notifyAdmins } from "@/lib/notify";

// Cache en mémoire pour éviter de re-géocoder les mêmes CP
const zipCache = new Map<string, { lat: number; lng: number }>();

async function geocodeZipFR(zip?: string | null): Promise<{ lat: number; lng: number } | null> {
  const code = (zip || "").trim();
  if (!code) return null;
  if (zipCache.has(code)) return zipCache.get(code)!;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=fr&postalcode=${encodeURIComponent(code)}&limit=1`;
    const res = await fetch(url, { headers: { "User-Agent": "lespcdewarren-marketplace/1.0" } });
    if (!res.ok) return null;
    const arr: any[] = await res.json();
    const item = arr?.[0];
    if (item?.lat && item?.lon) {
      const val = { lat: parseFloat(item.lat), lng: parseFloat(item.lon) };
      zipCache.set(code, val);
      return val;
    }
    return null;
  } catch {
    return null;
  }
}

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371; // km
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(la1) * Math.cos(la2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || undefined;
  const city = searchParams.get("city") || undefined;
  const minEuros = parseInt(searchParams.get("min") || "", 10);
  const maxEuros = parseInt(searchParams.get("max") || "", 10);
  const sortRaw = (searchParams.get("sort") || "newest");
  const sort = sortRaw.toLowerCase();
  const store = ["1", "true", "yes"].includes((searchParams.get("store") || "").toLowerCase());
  const mine = ["1", "true", "yes"].includes((searchParams.get("mine") || "").toLowerCase());
  const limitParam = parseInt(searchParams.get("limit") || "", 10);
  const pageParam = parseInt(searchParams.get("page") || "", 10);
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const radiusKm = parseFloat(searchParams.get("radius") || "");
  const useRadius = !isNaN(radiusKm) && radiusKm > 0;
  const hasCoords = !isNaN(lat) && !isNaN(lng);

  const take = !isNaN(limitParam) ? Math.min(Math.max(limitParam, 1), 60) : 30;
  const page = !isNaN(pageParam) ? Math.max(pageParam, 1) : 1;
  const skip = (page - 1) * take;

  // Nouveau: construire un where via AND/OR pour inclure SOLD < 24h côté public
  const whereAND: any[] = [];
  if (mine) {
    const session = await getSession();
    if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    whereAND.push({ sellerId: session.user.id });
  } else {
    const soldSince = new Date(Date.now() - 24 * 60 * 60 * 1000);
    whereAND.push({ OR: [ { status: "PUBLISHED" }, { status: "SOLD", updatedAt: { gte: soldSince } } ] });
    if (store) whereAND.push({ seller: { role: "ADMIN" } });
  }

  if (q) whereAND.push({ OR: [ { title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } } ] });
  if (city) whereAND.push({ city: { contains: city, mode: "insensitive" } });
  const priceFilter: any = {};
  if (!isNaN(minEuros)) priceFilter.gte = minEuros * 100;
  if (!isNaN(maxEuros)) priceFilter.lte = maxEuros * 100;
  if (Object.keys(priceFilter).length) whereAND.push({ priceCents: priceFilter });

  const where = whereAND.length ? { AND: whereAND } : {};

  let orderBy: any = { createdAt: "desc" };
  if (sort === "priceasc") orderBy = { priceCents: "asc" };
  else if (sort === "pricedesc") orderBy = { priceCents: "desc" };
  else if (sort === "oldest") orderBy = { createdAt: "asc" };

  // Mode proximité: si sort=nearest ET coordonnées fournies
  if (sort === "nearest" && hasCoords) {
    const base = await prisma.listing.findMany({
      where,
      include: { images: true, seller: { select: { id: true, name: true, profile: { select: { department: true } } } } },
      take: 400,
    });

    const center = { lat, lng };
    const withDist = await Promise.all(
      base.map(async (l: any) => {
        const pos = await geocodeZipFR(l.zip);
        const distanceKm = pos ? haversineKm(center, pos) : Number.POSITIVE_INFINITY;
        return { ...l, distanceKm };
      })
    );

    let filtered = withDist;
    if (useRadius) filtered = withDist.filter((x) => x.distanceKm <= radiusKm);

    filtered.sort((a, b) => (a.distanceKm - b.distanceKm));
    const pageItems = filtered.slice(skip, skip + take);
    return NextResponse.json({ data: pageItems });
  }

  // Sinon: tri DB classique
  const data = await prisma.listing.findMany({
    where,
    orderBy,
    include: {
      images: true,
      seller: { select: { id: true, name: true, profile: { select: { department: true } } } },
    },
    skip,
    take,
  });
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session.user) return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  const body = await req.json();
  const { title, description, priceCents, condition, city, zip, country, allowOnline = true, allowInPerson = true, images = [], specs } = body || {};
  if (!title || !priceCents || !condition) return NextResponse.json({ error: "Champs requis manquants" }, { status: 400 });

  const slugBase = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const slug = `${slugBase}-${Date.now().toString(36)}`;

  // petite validation specs (doit être un objet ou null)
  let specsData: any = null;
  if (specs && typeof specs === "object") specsData = specs;

  // Génération d'une description si absente
  const lines: string[] = [];
  if (!description) {
    lines.push(title);
    const add = (label: string, val?: string) => { if (val && String(val).trim()) lines.push(`${label}: ${String(val).trim()}`); };
    if (specsData) {
      add("CPU", specsData.cpu);
      add("GPU", specsData.gpu);
      add("RAM", specsData.ram);
      // Stockage: combine storage + storage2 si présents
      if (specsData.storage || specsData.storage2) {
        const storageLine = [specsData.storage, specsData.storage2].filter((x: any) => !!x && String(x).trim()).join(" + ");
        add("Stockage", storageLine);
      }
      add("Carte mère", specsData.motherboard);
      add("PSU", specsData.psu);
      add("Boîtier", specsData.case);
      add("OS", specsData.os);
      add("Écran", specsData.screen);
      add("Notes", specsData.notes);
    }
    add("État", condition);
    if (city || zip || country) lines.push(`Localisation: ${[city, zip, country].filter(Boolean).join(" ")}`);
  }
  const finalDescription: string = description || lines.join("\n");

  // Filtre simple pour ne garder que des chaînes
  const safeImages = (Array.isArray(images) ? images : []).filter((u) => typeof u === "string").slice(0, 12);

  const baseData: any = {
    title,
    slug,
    description: finalDescription,
    priceCents: Number(priceCents),
    condition,
    city,
    zip,
    allowOnline: !!allowOnline,
    allowInPerson: !!allowInPerson,
    sellerId: session.user.id,
    images: { create: safeImages.map((url: string) => ({ url })) },
    status: "PENDING_REVIEW",
    ...(specsData ? { specs: specsData as any } : {}),
  };
  if (typeof country === 'string' && country.trim()) baseData.country = country.trim().toUpperCase();

  let listing;
  try {
    listing = await prisma.listing.create({ data: baseData, include: { images: true } });
  } catch (err: any) {
    const msg = String(err?.message || err);
    if (msg.includes("Unknown argument `country`")) {
      // Fallback: réessayer sans le champ country (migration non appliquée)
      const { country: _omit, ...withoutCountry } = baseData;
      listing = await prisma.listing.create({ data: withoutCountry, include: { images: true } });
    } else {
      throw err;
    }
  }

  // Notifier l'admin pour modération (best-effort)
  notifyAdmins({
    type: "ORDER_EVENT",
    title: "Nouvelle annonce à valider",
    message: `"${listing.title}" créée par ${session.user.email}`,
    link: "/admin",
    emailSubject: `Annonce à valider: ${listing.title}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true, listing });
}
