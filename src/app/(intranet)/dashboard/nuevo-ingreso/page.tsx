import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { NuevoIngresoClient } from "./nuevo-ingreso-client"

export default async function NuevoIngresoPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) redirect("/dashboard")

  const [onboardings, employees] = await Promise.all([
    prisma.onboarding.findMany({
      include: {
        employee: {
          select: {
            id: true,
            fullName: true,
            position: true,
            hireDate: true,
            photoUrl: true,
            department: { select: { name: true } },
          },
        },
        items: { orderBy: [{ category: "asc" }, { createdAt: "asc" }] },
      },
      orderBy: { startDate: "desc" },
    }),
    prisma.employee.findMany({
      where: { isActive: true, onboarding: null },
      select: { id: true, fullName: true, department: { select: { name: true } }, hireDate: true },
      orderBy: { fullName: "asc" },
    }),
  ])

  return (
    <NuevoIngresoClient
      onboardings={JSON.parse(JSON.stringify(onboardings))}
      availableEmployees={JSON.parse(JSON.stringify(employees))}
      isAdmin={["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")}
    />
  )
}
