import { prisma } from "@/lib/prisma"
import { LoginForm } from "./login-form"

export default async function LoginPage() {
  const configs = await prisma.systemConfig.findMany({
    where: { key: { in: ["company_name", "company_logo"] } },
  })
  const cfg = Object.fromEntries(configs.map((c) => [c.key, c.value]))
  return (
    <LoginForm
      companyName={cfg.company_name ?? "RIM Rigging"}
      companyLogo={cfg.company_logo ?? null}
    />
  )
}
