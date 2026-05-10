import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { DashboardClient } from "@/components/dashboard/dashboard-client"

export default async function DashboardPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")

  // Departamento del usuario
  let userDept: { id: string; name: string } | null = null
  if (session.user.employeeId) {
    const emp = await prisma.employee.findUnique({
      where: { id: session.user.employeeId },
      include: { department: true },
    })
    if (emp?.department) {
      userDept = { id: emp.department.id, name: emp.department.name }
    }
  }

  const now = new Date()
  const in60 = new Date(); in60.setDate(now.getDate() + 60)
  const in30 = new Date(); in30.setDate(now.getDate() + 30)

  // Avisos visibles para este usuario
  const announcements = await prisma.announcement.findMany({
    where: {
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      AND: [{
        OR: [
          { targetDepartmentId: null },
          { targetDepartmentId: userDept?.id ?? "__none__" },
        ],
      }],
    },
    include: { targetDepartment: { select: { name: true } } },
    orderBy: [{ isPinned: "desc" }, { createdAt: "desc" }],
    take: 10,
  })

  // Departamentos para el formulario de avisos
  const departments = isAdmin
    ? await prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } })
    : []

  // ─── Datos por departamento ───────────────────────────────────────────────

  const deptName = userDept?.name ?? ""
  const deptId = userDept?.id

  // RH y ADMIN — siempre ven stats globales
  const globalStats = isAdmin ? await prisma.$transaction([
    prisma.employee.count({ where: { isActive: true } }),
    prisma.overtimeRecord.count({ where: { status: "PENDIENTE" } }),
    prisma.timeOffRequest.count({ where: { status: "PENDIENTE" } }),
    prisma.purchaseRequisition.count({ where: { status: "PENDIENTE" } }),
    prisma.repairRequest.count({ where: { status: "PENDIENTE" } }),
  ]) : [0, 0, 0, 0, 0]

  // Cumpleanos del mes (para RH)
  const birthdayEmployees = deptName === "Recursos Humanos" || isAdmin
    ? await prisma.employee.findMany({
        where: {
          isActive: true,
          birthDate: { not: null },
        },
        select: { fullName: true, birthDate: true, position: true },
      }).then((emps) =>
        emps.filter((e) => {
          if (!e.birthDate) return false
          const bd = new Date(e.birthDate)
          return bd.getMonth() === now.getMonth()
        })
      )
    : []

  // DC3 por vencer (Operaciones y RH)
  const dc3Expiring = (deptName === "Operaciones" || deptName === "Recursos Humanos" || isAdmin)
    ? await prisma.dC3Record.findMany({
        where: {
          isActive: true,
          expiresAt: { lte: in60, gte: now },
        },
        include: { employee: { select: { fullName: true } } },
        orderBy: { expiresAt: "asc" },
        take: 10,
      })
    : []

  // Equipos en reparacion (Taller y Operaciones)
  const equipmentInRepair = (deptName === "Taller" || deptName === "Operaciones" || isAdmin)
    ? await prisma.equipment.findMany({
        where: { status: "EN_REPARACION" },
        include: {
          repairRequests: {
            where: { status: "PENDIENTE" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
        take: 10,
      })
    : []

  // Equipos proximos a servicio preventivo (Taller)
  const equipmentNearService = (deptName === "Taller" || isAdmin)
    ? await prisma.equipment.findMany({
        where: {
          isActive: true,
          nextServiceDate: { lte: in30, gte: now },
        },
        orderBy: { nextServiceDate: "asc" },
        take: 10,
      })
    : []

  // Herramientas danadas (Almacen y Taller)
  const damagedTools = (deptName === "Almacen" || deptName === "Taller" || isAdmin)
    ? await prisma.tool.findMany({
        where: { condition: { in: ["MALA", "BAJA"] }, isActive: true },
        take: 10,
      })
    : []

  // Herramientas no devueltas (Almacen)
  const overdueCheckouts = (deptName === "Almacen" || isAdmin)
    ? await prisma.toolCheckout.findMany({
        where: {
          returnedAt: null,
          expectedReturn: { lt: now },
        },
        include: {
          tool: { select: { name: true, code: true } },
          employee: { select: { fullName: true } },
        },
        take: 10,
      })
    : []

  // Requisiciones pendientes (Almacen y Taller)
  const pendingRequisitions = (deptName === "Almacen" || deptName === "Taller" || isAdmin)
    ? await prisma.purchaseRequisition.findMany({
        where: { status: "PENDIENTE" },
        include: { department: { select: { name: true } } },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        take: 10,
      })
    : []

  // Proyectos activos (Ventas y Operaciones)
  const activeProjects = (deptName === "Ventas" || deptName === "Operaciones" || isAdmin)
    ? await prisma.project.findMany({
        where: { status: "EN_DESARROLLO", isActive: true },
        include: { tasks: { select: { progress: true } } },
        orderBy: { updatedAt: "desc" },
        take: 8,
      })
    : []

  // Banco de horas — saldo del usuario actual (operativos)
  let myBankBalance = 0
  if (session.user.employeeId && session.user.employeeType === "OPERATIVO") {
    const bank = await prisma.hoursBank.findMany({
      where: { employeeId: session.user.employeeId, isExpired: false },
      select: { hoursAvailable: true },
    })
    myBankBalance = bank.reduce((s, e) => s + Number(e.hoursAvailable), 0)
  }

  return (
    <DashboardClient
      userName={session.user.name ?? ""}
      userRole={session.user.role ?? "EMPLEADO"}
      userDept={userDept}
      employeeType={session.user.employeeType ?? null}
      isAdmin={isAdmin}
      announcements={JSON.parse(JSON.stringify(announcements))}
      departments={departments}
      globalStats={{
        totalEmployees: globalStats[0],
        pendingOvertimes: globalStats[1],
        pendingTimeOffs: globalStats[2],
        pendingRequisitions: globalStats[3],
        pendingRepairs: globalStats[4],
      }}
      myBankBalance={myBankBalance}
      dc3Expiring={JSON.parse(JSON.stringify(dc3Expiring))}
      equipmentInRepair={JSON.parse(JSON.stringify(equipmentInRepair))}
      equipmentNearService={JSON.parse(JSON.stringify(equipmentNearService))}
      damagedTools={JSON.parse(JSON.stringify(damagedTools))}
      overdueCheckouts={JSON.parse(JSON.stringify(overdueCheckouts))}
      pendingRequisitionsList={JSON.parse(JSON.stringify(pendingRequisitions))}
      activeProjects={JSON.parse(JSON.stringify(activeProjects))}
      birthdayEmployees={JSON.parse(JSON.stringify(birthdayEmployees))}
    />
  )
}
