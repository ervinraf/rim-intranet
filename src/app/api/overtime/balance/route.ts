import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getEmployeeTotalBalance } from "@/lib/overtime"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const targetId = searchParams.get("employeeId")
  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const employeeId = isAdmin && targetId ? targetId : session.user.employeeId
  if (!employeeId) return NextResponse.json({ error: "Empleado no encontrado" }, { status: 400 })

  const now = new Date()

  // Marcar como expiradas las entradas vencidas
  await prisma.hoursBank.updateMany({
    where: {
      employeeId,
      isExpired: false,
      expiresAt: { lt: now },
    },
    data: { isExpired: true, hoursAvailable: 0 },
  })

  const entries = await prisma.hoursBank.findMany({
    where: { employeeId },
    include: {
      overtimeRecord: {
        select: { weekStart: true, weekEnd: true, hoursWorked: true },
      },
    },
    orderBy: { creditedAt: "desc" },
  })

  const totalBalance = getEmployeeTotalBalance(
    entries.map((e) => ({
      hoursAvailable: Number(e.hoursAvailable),
      expiresAt: e.expiresAt,
      isExpired: e.isExpired,
    }))
  )

  return NextResponse.json({ totalBalance, entries })
}
