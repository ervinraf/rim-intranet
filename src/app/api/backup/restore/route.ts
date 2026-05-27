import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@prisma/client"

export const maxDuration = 60

export async function POST(req: Request) {
  const session = await auth()
  if (session?.user?.role !== "SUPERADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 403 })
  }

  const pwd = req.headers.get("X-Backup-Password")
  if (!pwd || pwd !== process.env.BACKUP_PASSWORD) {
    return Response.json({ error: "Contrasena incorrecta" }, { status: 401 })
  }

  let backup: Record<string, unknown>
  try {
    const text = await req.text()
    backup = JSON.parse(text)
  } catch {
    return Response.json({ error: "Archivo JSON invalido" }, { status: 400 })
  }

  if (backup.version !== "1.0") {
    return Response.json({ error: "Version de respaldo no compatible" }, { status: 400 })
  }

  const get = (key: string) => (Array.isArray(backup[key]) ? backup[key] : [])

  try {
    // Disable FK checks so we can delete/insert in any order
    await prisma.$executeRaw(Prisma.sql`SET FOREIGN_KEY_CHECKS = 0`)

    // Delete all tables (order doesn't matter with FK checks off)
    await prisma.$transaction([
      prisma.onboardingItem.deleteMany(),
      prisma.onboarding.deleteMany(),
      prisma.checkListItem.deleteMany(),
      prisma.checkList.deleteMany(),
      prisma.clientSurvey.deleteMany(),
      prisma.projectForm.deleteMany(),
      prisma.projectPhoto.deleteMany(),
      prisma.projectUpdate.deleteMany(),
      prisma.projectTask.deleteMany(),
      prisma.toolCheckout.deleteMany(),
      prisma.equipmentLog.deleteMany(),
      prisma.repairRequest.deleteMany(),
      prisma.documentPermission.deleteMany(),
      prisma.documentVersion.deleteMany(),
      prisma.timeOffRequest.deleteMany(),
      prisma.vacationRequest.deleteMany(),
      prisma.hoursBank.deleteMany(),
      prisma.overtimeRecord.deleteMany(),
      prisma.attendance.deleteMany(),
      prisma.dC3Record.deleteMany(),
      prisma.ePPRecord.deleteMany(),
      prisma.purchaseRequisition.deleteMany(),
      prisma.vale.deleteMany(),
      prisma.document.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.equipment.deleteMany(),
      prisma.tool.deleteMany(),
      prisma.announcement.deleteMany(),
      prisma.project.deleteMany(),
      prisma.account.deleteMany(),
      prisma.session.deleteMany(),
      prisma.employee.deleteMany(),
      prisma.user.deleteMany(),
      prisma.rolePermission.deleteMany(),
      prisma.role.deleteMany(),
      prisma.permission.deleteMany(),
      prisma.department.deleteMany(),
      prisma.documentCategory.deleteMany(),
      prisma.ePPCatalog.deleteMany(),
      prisma.systemConfig.deleteMany(),
      prisma.verificationToken.deleteMany(),
    ])

    // Re-insert in dependency order
    const inserts = [
      get("systemConfigs").length ? prisma.systemConfig.createMany({ data: get("systemConfigs") as never[] }) : null,
      get("documentCategories").length ? prisma.documentCategory.createMany({ data: get("documentCategories") as never[] }) : null,
      get("eppCatalog").length ? prisma.ePPCatalog.createMany({ data: get("eppCatalog") as never[] }) : null,
      get("permissions").length ? prisma.permission.createMany({ data: get("permissions") as never[] }) : null,
      get("verificationTokens").length ? prisma.verificationToken.createMany({ data: get("verificationTokens") as never[] }) : null,
      get("departments").length ? prisma.department.createMany({ data: get("departments") as never[], skipDuplicates: true }) : null,
      get("roles").length ? prisma.role.createMany({ data: get("roles") as never[] }) : null,
      get("rolePermissions").length ? prisma.rolePermission.createMany({ data: get("rolePermissions") as never[] }) : null,
      get("users").length ? prisma.user.createMany({ data: get("users") as never[] }) : null,
      get("employees").length ? prisma.employee.createMany({ data: get("employees") as never[] }) : null,
    ]
    for (const op of inserts) if (op) await op

    const inserts2 = [
      get("accounts").length ? prisma.account.createMany({ data: get("accounts") as never[] }) : null,
      get("sessions").length ? prisma.session.createMany({ data: get("sessions") as never[] }) : null,
      get("auditLogs").length ? prisma.auditLog.createMany({ data: get("auditLogs") as never[] }) : null,
      get("documents").length ? prisma.document.createMany({ data: get("documents") as never[] }) : null,
      get("equipment").length ? prisma.equipment.createMany({ data: get("equipment") as never[] }) : null,
      get("tools").length ? prisma.tool.createMany({ data: get("tools") as never[] }) : null,
      get("announcements").length ? prisma.announcement.createMany({ data: get("announcements") as never[] }) : null,
      get("projects").length ? prisma.project.createMany({ data: get("projects") as never[] }) : null,
    ]
    for (const op of inserts2) if (op) await op

    const inserts3 = [
      get("documentVersions").length ? prisma.documentVersion.createMany({ data: get("documentVersions") as never[] }) : null,
      get("documentPermissions").length ? prisma.documentPermission.createMany({ data: get("documentPermissions") as never[] }) : null,
      get("overtimeRecords").length ? prisma.overtimeRecord.createMany({ data: get("overtimeRecords") as never[] }) : null,
    ]
    for (const op of inserts3) if (op) await op

    const inserts4 = [
      get("hoursBank").length ? prisma.hoursBank.createMany({ data: get("hoursBank") as never[] }) : null,
    ]
    for (const op of inserts4) if (op) await op

    const inserts5 = [
      get("timeOffRequests").length ? prisma.timeOffRequest.createMany({ data: get("timeOffRequests") as never[] }) : null,
      get("vacationRequests").length ? prisma.vacationRequest.createMany({ data: get("vacationRequests") as never[] }) : null,
      get("attendance").length ? prisma.attendance.createMany({ data: get("attendance") as never[] }) : null,
      get("dc3Records").length ? prisma.dC3Record.createMany({ data: get("dc3Records") as never[] }) : null,
      get("eppRecords").length ? prisma.ePPRecord.createMany({ data: get("eppRecords") as never[] }) : null,
      get("purchaseRequisitions").length ? prisma.purchaseRequisition.createMany({ data: get("purchaseRequisitions") as never[] }) : null,
      get("vales").length ? prisma.vale.createMany({ data: get("vales") as never[] }) : null,
      get("toolCheckouts").length ? prisma.toolCheckout.createMany({ data: get("toolCheckouts") as never[] }) : null,
      get("equipmentLogs").length ? prisma.equipmentLog.createMany({ data: get("equipmentLogs") as never[] }) : null,
      get("repairRequests").length ? prisma.repairRequest.createMany({ data: get("repairRequests") as never[] }) : null,
      get("projectTasks").length ? prisma.projectTask.createMany({ data: get("projectTasks") as never[] }) : null,
      get("projectPhotos").length ? prisma.projectPhoto.createMany({ data: get("projectPhotos") as never[] }) : null,
      get("projectUpdates").length ? prisma.projectUpdate.createMany({ data: get("projectUpdates") as never[] }) : null,
      get("projectForms").length ? prisma.projectForm.createMany({ data: get("projectForms") as never[] }) : null,
      get("checkLists").length ? prisma.checkList.createMany({ data: get("checkLists") as never[] }) : null,
      get("clientSurveys").length ? prisma.clientSurvey.createMany({ data: get("clientSurveys") as never[] }) : null,
    ]
    for (const op of inserts5) if (op) await op

    const inserts6 = [
      get("checkListItems").length ? prisma.checkListItem.createMany({ data: get("checkListItems") as never[] }) : null,
      get("onboardings").length ? prisma.onboarding.createMany({ data: get("onboardings") as never[] }) : null,
    ]
    for (const op of inserts6) if (op) await op

    if (get("onboardingItems").length) {
      await prisma.onboardingItem.createMany({ data: get("onboardingItems") as never[] })
    }

    await prisma.$executeRaw(Prisma.sql`SET FOREIGN_KEY_CHECKS = 1`)

    return Response.json({ ok: true })
  } catch (err) {
    await prisma.$executeRaw(Prisma.sql`SET FOREIGN_KEY_CHECKS = 1`).catch(() => {})
    console.error("Restore error:", err)
    return Response.json(
      { error: err instanceof Error ? err.message : "Error durante la restauracion" },
      { status: 500 }
    )
  }
}
