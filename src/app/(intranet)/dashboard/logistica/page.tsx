import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { LogisticaClient } from "./logistica-client"

export default async function LogisticaPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const [vehicles, employees, projects] = await Promise.all([
    prisma.vehicle.findMany({
      where: { isActive: true },
      include: {
        driver: { select: { id: true, fullName: true, licenciaNumero: true, licenciaVencimiento: true } },
        maintenanceLogs: { orderBy: { date: "desc" }, take: 5 },
        checklists: {
          orderBy: { date: "desc" },
          take: 3,
          include: { items: { orderBy: { order: "asc" } } },
        },
      },
      orderBy: { brand: "asc" },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, fullName: true, licenciaNumero: true, licenciaVencimiento: true },
      orderBy: { fullName: "asc" },
    }).then((emps) => emps.map((e) => ({
      ...e,
      licenciaVencimiento: e.licenciaVencimiento?.toISOString() ?? null,
    }))),
    prisma.project.findMany({
      where: { isActive: true, status: { not: "CERRADO" } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ])

  return (
    <LogisticaClient
      vehicles={JSON.parse(JSON.stringify(vehicles))}
      employees={employees}
      projects={projects}
      isAdmin={isAdmin}
    />
  )
}
