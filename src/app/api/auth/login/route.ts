import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import bcrypt from "bcryptjs";

const attempts: any = (globalThis as any).__loginAttempts || ((globalThis as any).__loginAttempts = new Map<string, { c: number; t: number }>());
function now() { return Date.now(); }

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) return Response.json({ error: "Invalid credentials" }, { status: 401 });

    const ip = (req.headers as any).get?.("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
    const emailRaw = String(email);
    const emailNorm = emailRaw.trim().toLowerCase();

    const key = `${ip}|${emailNorm}`;
    const cur = attempts.get(key);
    const t = now();
    if (cur && cur.c >= 5 && t - cur.t < 10 * 60 * 1000) {
      const remainingMinutes = Math.ceil((10 * 60 * 1000 - (t - cur.t)) / 60000);
      return Response.json({ error: `Trop de tentatives. Réessayez dans ${remainingMinutes} minute(s)` }, { status: 429 });
    }

    // Recherche tolérante à la casse
    const user = await prisma.user.findFirst({ where: { OR: [{ email: emailRaw }, { email: emailNorm }] } });
    
    if (!user) {
      console.log(`[LOGIN] Utilisateur non trouvé: ${emailRaw} / ${emailNorm}`);
      if (!cur || t - cur.t > 10 * 60 * 1000) attempts.set(key, { c: 1, t });
      else { cur.c++; cur.t = t; }
      await new Promise((r) => setTimeout(r, 400 + Math.floor(Math.random() * 300)));
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // Comparaison du mot de passe
    const ok = await bcrypt.compare(String(password), user.passwordHash);
    
    if (!ok) {
      console.log(`[LOGIN] Mot de passe incorrect pour: ${user.email}`);
      if (!cur || t - cur.t > 10 * 60 * 1000) attempts.set(key, { c: 1, t });
      else { cur.c++; cur.t = t; }
      // Léger délai pour ralentir bruteforce
      await new Promise((r) => setTimeout(r, 400 + Math.floor(Math.random() * 300)));
      return Response.json({ error: "Invalid credentials" }, { status: 401 });
    }

    console.log(`[LOGIN] Connexion réussie: ${user.email} (${user.role})`);

    const session = await getSession();
    session.user = { id: user.id, email: user.email, name: user.name, role: user.role } as any;
    await session.save();

    // reset attempts on success
    attempts.delete(key);

    return Response.json({ ok: true, user: session.user });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
