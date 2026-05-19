import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { GanttGlobalClient } from "@/components/gantt/gantt-global-client"

export default async function GanttPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const projects = await prisma.project.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      clientName: true,
      status: true,
      startDate: true,
      endDate: true,
      progress: true,
    },
    orderBy: { startDate: "asc" },
  })

  return <GanttGlobalClient projects={JSON.parse(JSON.stringify(projects))} />
}
