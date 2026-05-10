import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { InventoryClient } from "@/components/inventory/inventory-client"

export default async function HerramientasPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const [tools, equipment, requisitions, repairs, departments, projects, employees] =
    await Promise.all([
      prisma.tool.findMany({
        where: { isActive: true },
        include: {
          department: { select: { name: true } },
          checkouts: {
            where: { returnedAt: null },
            include: {
              employee: { select: { fullName: true } },
              project: { select: { name: true } },
            },
            take: 1,
          },
        },
        orderBy: [{ status: "asc" }, { name: "asc" }],
      }),
      prisma.equipment.findMany({
        where: { isActive: true },
        include: {
          department: { select: { name: true } },
          project: { select: { name: true } },
          logs: { orderBy: { createdAt: "desc" }, take: 3 },
        },
        orderBy: [{ status: "asc" }, { name: "asc" }],
      }),
      prisma.purchaseRequisition.findMany({
        where: { status: { in: ["PENDIENTE", "APROBADO"] } },
        include: {
          department: { select: { name: true } },
          project: { select: { name: true } },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: 50,
      }),
      prisma.repairRequest.findMany({
        where: { status: { not: "SURTIDO" } },
        include: {
          tool: { select: { name: true, code: true } },
          equipment: { select: { name: true, code: true } },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: 50,
      }),
      prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.project.findMany({
        where: { status: { in: ["NUEVO", "EN_DESARROLLO"] } },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
      prisma.employee.findMany({
        where: { isActive: true },
        select: { id: true, fullName: true, department: { select: { name: true } } },
        orderBy: { fullName: "asc" },
      }),
    ])

  return (
    <InventoryClient
      tools={JSON.parse(JSON.stringify(tools))}
      equipment={JSON.parse(JSON.stringify(equipment))}
      requisitions={JSON.parse(JSON.stringify(requisitions))}
      repairs={JSON.parse(JSON.stringify(repairs))}
      departments={departments}
      projects={projects}
      employees={employees}
      isAdmin={isAdmin}
    />
  )
}
