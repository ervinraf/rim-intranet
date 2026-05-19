import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { VacacionesClient } from "./vacaciones-client"

export default async function VacacionesPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")

  const requests = await prisma.vacationRequest.findMany({
    where: isAdmin ? {} : { employeeId: session.user.employeeId ?? "__none__" },
    include: {
      employee: { select: { fullName: true, department: { select: { name: true } } } },
      approvedBy: { select: { fullName: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  })

  return (
    <VacacionesClient
      requests={JSON.parse(JSON.stringify(requests))}
      isAdmin={isAdmin}
      hasEmployee={!!session.user.employeeId}
    />
  )
}
