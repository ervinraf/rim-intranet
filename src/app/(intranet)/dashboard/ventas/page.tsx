import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { VentasClient } from "./ventas-client"

export default async function VentasPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")

  const projects = await prisma.salesProject.findMany({
    where: { isActive: true },
    include: { payments: { orderBy: { date: "desc" } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <VentasClient
      projects={JSON.parse(JSON.stringify(projects))}
      isAdmin={isAdmin}
    />
  )
}
