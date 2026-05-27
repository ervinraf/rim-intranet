import { auth } from "@/lib/auth"

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "SUPERADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 403 })
  }

  const { password } = await req.json().catch(() => ({}))
  if (!password || password !== process.env.BACKUP_PASSWORD) {
    return Response.json({ error: "Contrasena incorrecta" }, { status: 401 })
  }

  return Response.json({ ok: true })
}
