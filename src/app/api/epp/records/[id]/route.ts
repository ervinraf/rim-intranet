import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

// Registrar devolucion de EPP
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) return NextResponse.json({ error: "Sin permiso" }, { status: 403 })

  const { id } = await params
  const { conditionReturn, notes } = await req.json()

  const updated = await prisma.ePPRecord.update({
    where: { id },
    data: {
      returnedAt: new Date(),
      condition: conditionReturn ?? "BUENA",
      notes: notes ?? undefined,
    },
  })

  return NextResponse.json(updated)
}
