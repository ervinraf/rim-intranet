export const dynamic = 'force-dynamic'

import { prisma } from "@/lib/prisma"
import { EncuestaForm } from "./encuesta-form"

export default async function EncuestaPage() {
  const configs = await prisma.systemConfig.findMany({
    where: { key: { in: ["company_name", "company_logo"] } },
  })
  const cfg = Object.fromEntries(configs.map((c) => [c.key, c.value]))

  return (
    <EncuestaForm
      companyName={cfg.company_name ?? "RIM Rigging"}
      companyLogo={cfg.company_logo ?? null}
    />
  )
}
