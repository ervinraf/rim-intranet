import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function parseTime(date: string, time: string | null | undefined): Date | null {
  if (!time?.trim()) return null
  const t = time.trim()
  if (/^\d{1,2}:\d{2}(:\d{2})?$/.test(t)) {
    return new Date(`${date}T${t.padStart(5, "0")}:00`)
  }
  return null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  const record = await prisma.attendance.findUnique({ where: { id } })
  if (!record) return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 })

  const { checkIn, checkOut, type, notes } = await req.json()

  const dateStr = record.date.toISOString().slice(0, 10)

  const updated = await prisma.attendance.update({
    where: { id },
    data: {
      checkIn: checkIn ? parseTime(dateStr, checkIn) : null,
      checkOut: checkOut ? parseTime(dateStr, checkOut) : null,
      type: type ?? record.type,
      notes: notes ?? null,
      registeredById: session.user.id,
    },
    include: {
      employee: {
        select: {
          fullName: true,
          position: true,
          department: { select: { name: true } },
        },
      },
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  await prisma.attendance.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
