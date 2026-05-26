import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { EjecutivoClient } from "./ejecutivo-client"

export default async function EjecutivoPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const role = session.user.role ?? ""
  if (!["SUPERADMIN", "ADMIN", "GERENTE"].includes(role)) redirect("/dashboard")

  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(startOfToday.getTime() + 86_400_000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const in30Days = new Date(now.getTime() + 30 * 86_400_000)

  const [
    activeProjects,
    closedThisMonth,
    equipmentOutOfService,
    equipmentNearService,
    todayAttendance,
    totalEmployees,
    pendingRequisitions,
    overdueTasks,
  ] = await Promise.all([
    prisma.project.findMany({
      where: { isActive: true, status: { in: ["NUEVO", "EN_DESARROLLO"] } },
      select: {
        id: true,
        name: true,
        clientName: true,
        progress: true,
        startDate: true,
        endDate: true,
        status: true,
        tasks: { select: { progress: true, endDate: true, actualEndDate: true } },
      },
      orderBy: { progress: "asc" },
    }),

    prisma.project.count({
      where: { status: "CERRADO", updatedAt: { gte: startOfMonth } },
    }),

    prisma.equipment.count({
      where: { isActive: true, status: { in: ["EN_REPARACION", "BAJA"] } },
    }),

    prisma.equipment.findMany({
      where: { isActive: true, nextServiceDate: { lte: in30Days } },
      select: { id: true, name: true, nextServiceDate: true, status: true },
      orderBy: { nextServiceDate: "asc" },
      take: 6,
    }),

    prisma.attendance.findMany({
      where: { date: { gte: startOfToday, lt: endOfToday } },
      select: {
        type: true,
        employee: {
          select: {
            fullName: true,
            department: { select: { name: true } },
          },
        },
      },
    }),

    prisma.employee.count({ where: { isActive: true } }),

    prisma.purchaseRequisition.count({ where: { status: "PENDIENTE" } }),

    prisma.projectTask.findMany({
      where: {
        project: { isActive: true, status: { in: ["NUEVO", "EN_DESARROLLO"] } },
        endDate: { lt: now },
        actualEndDate: null,
        progress: { lt: 100 },
      },
      select: {
        id: true,
        name: true,
        endDate: true,
        progress: true,
        project: { select: { id: true, name: true } },
      },
      orderBy: { endDate: "asc" },
      take: 6,
    }),
  ])

  return (
    <EjecutivoClient
      activeProjects={JSON.parse(JSON.stringify(activeProjects))}
      closedThisMonth={closedThisMonth}
      equipmentOutOfService={equipmentOutOfService}
      equipmentNearService={JSON.parse(JSON.stringify(equipmentNearService))}
      todayAttendance={JSON.parse(JSON.stringify(todayAttendance))}
      totalEmployees={totalEmployees}
      pendingRequisitions={pendingRequisitions}
      overdueTasks={JSON.parse(JSON.stringify(overdueTasks))}
    />
  )
}
