import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { DC3Client } from "./dc3-client"

export default async function DC3Page() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const threshold = new Date()
  threshold.setDate(threshold.getDate() + 60)
  const now = new Date()

  const [dc3Records, eppRecords, eppCatalog, employees, departments] = await Promise.all([
    prisma.dC3Record.findMany({
      where: {
        isActive: true,
        ...(!isAdmin ? { employeeId: session.user.employeeId ?? "__none__" } : {}),
      },
      include: {
        employee: { select: { fullName: true, department: { select: { name: true } } } },
      },
      orderBy: [{ expiresAt: "asc" }, { completedAt: "desc" }],
    }),
    prisma.ePPRecord.findMany({
      where: {
        returnedAt: null,
        ...(!isAdmin ? { employeeId: session.user.employeeId ?? "__none__" } : {}),
      },
      include: {
        item: { select: { name: true } },
        employee: { select: { fullName: true, department: { select: { name: true } } } },
      },
      orderBy: [{ employeeId: "asc" }, { issuedAt: "desc" }],
    }),
    prisma.ePPCatalog.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    isAdmin
      ? prisma.employee.findMany({
          where: { isActive: true, employeeType: { in: ["OPERATIVO", "SUPERVISOR"] } },
          select: { id: true, fullName: true, department: { select: { name: true } } },
          orderBy: { fullName: "asc" },
        })
      : [],
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ])

  // Enriquecer DC3 con status de vencimiento
  const enrichedDC3 = dc3Records.map((r) => ({
    ...r,
    expiryStatus: !r.expiresAt
      ? "NO_VENCE"
      : new Date(r.expiresAt) < now
      ? "VENCIDO"
      : new Date(r.expiresAt) <= threshold
      ? "POR_VENCER"
      : "VIGENTE",
  }))

  return (
    <DC3Client
      dc3={JSON.parse(JSON.stringify(enrichedDC3))}
      epp={JSON.parse(JSON.stringify(eppRecords))}
      eppCatalog={eppCatalog}
      employees={JSON.parse(JSON.stringify(employees))}
      departments={departments}
      isAdmin={isAdmin}
    />
  )
}
