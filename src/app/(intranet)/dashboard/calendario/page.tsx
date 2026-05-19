import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { CalendarioClient } from "./calendario-client"

export default async function CalendarioPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const projects = await prisma.project.findMany({
    where: { isActive: true, status: { not: "CERRADO" } },
    select: {
      id: true, name: true, clientName: true, status: true,
      startDate: true, endDate: true, progress: true,
    },
    orderBy: { startDate: "asc" },
  })

  return <CalendarioClient projects={JSON.parse(JSON.stringify(projects))} />
}
