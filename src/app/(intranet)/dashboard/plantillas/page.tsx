import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { PlantillasClient } from "./plantillas-client"

export const metadata = { title: "Plantillas descargables" }

export default async function PlantillasPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) redirect("/dashboard")

  return <PlantillasClient />
}
