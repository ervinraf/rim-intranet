import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

const KEYS = ["company_history", "company_vision", "company_mission", "company_services"]

export async function GET() {
  const configs = await prisma.systemConfig.findMany({ where: { key: { in: KEYS } } })
  const map = Object.fromEntries(configs.map((c) => [c.key, c.value]))
  return NextResponse.json(map)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const body = await req.json()

  await Promise.all(
    KEYS.filter((k) => body[k] !== undefined).map((k) =>
      prisma.systemConfig.upsert({
        where: { key: k },
        update: { value: body[k] },
        create: { key: k, value: body[k], description: k },
      })
    )
  )

  return NextResponse.json({ ok: true })
}
