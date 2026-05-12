import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 5), 1), 10);
    if (q.length < 3) return NextResponse.json({ suggestions: [] });

    const resp = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(q)}&limit=${limit}&autocomplete=1`, { cache: "no-store" });
    if (!resp.ok) return NextResponse.json({ suggestions: [] });
    const json: any = await resp.json();
    const suggestions = (json?.features || []).map((f: any) => {
      const p = f.properties || {};
      const number = p.housenumber ? `${p.housenumber} ` : "";
      const street = p.street || p.name || "";
      const address1 = `${number}${street}`.trim();
      return {
        label: p.label || `${address1}, ${p.postcode || ""} ${p.city || ""}`.trim(),
        address1,
        zip: p.postcode || "",
        city: p.city || p.citycode || "",
        country: "France",
        position: f.geometry?.coordinates || null,
      };
    });
    return NextResponse.json({ suggestions });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ suggestions: [] });
  }
}
