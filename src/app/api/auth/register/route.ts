import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { notifyAdmins } from "@/lib/notify";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      firstName,
      lastName,
      phone,
      address1,
      address2,
      zip,
      city,
      department,
      country,
    } = body || {};

    if (!email || !password || !firstName || !lastName || !address1 || !zip || !city || !country) {
      return Response.json({ error: "Champs requis manquants" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return Response.json({ error: "Email déjà utilisé" }, { status: 409 });

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name: `${firstName} ${lastName}`.trim(),
        role: "USER",
        profile: {
          create: { firstName, lastName, phone: phone || null, address1, address2: address2 || null, zip, city, department: department || null, country },
        },
      },
      include: { profile: true },
    });

    // Notifications admin (best-effort)
    notifyAdmins({
      type: "ORDER_EVENT",
      title: "Nouvel utilisateur inscrit",
      message: `${user.email} vient de créer un compte`,
      link: "/admin/users",
      emailSubject: `Nouvel utilisateur: ${user.email}`,
    }).catch(() => {});

    return Response.json({ ok: true, user: { id: user.id, email: user.email } }, { status: 201 });
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Erreur serveur" }, { status: 500 });
  }
}
