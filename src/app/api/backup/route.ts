import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

function esc(val: unknown): string {
  if (val === null || val === undefined) return "NULL"
  if (typeof val === "boolean") return val ? "1" : "0"
  if (typeof val === "number") return String(val)
  if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace("T", " ")}'`
  if (typeof val === "object") {
    return `'${JSON.stringify(val).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'`
  }
  return `'${String(val).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n")}'`
}

function toInserts(table: string, rows: Record<string, unknown>[]): string {
  if (!rows.length) return `-- ${table}: sin registros\n\n`
  const cols = Object.keys(rows[0])
    .map((c) => `\`${c}\``)
    .join(", ")
  const lines = rows.map((r) => `  (${Object.values(r).map(esc).join(", ")})`)
  return `INSERT INTO \`${table}\` (${cols}) VALUES\n${lines.join(",\n")};\n\n`
}

export async function GET() {
  const session = await auth()
  if (session?.user?.role !== "SUPERADMIN") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 })
  }

  const [
    roles,
    permissions,
    rolePermissions,
    documentCategories,
    departments,
    users,
    employees,
    accounts,
    sessions,
    verificationTokens,
    systemConfigs,
    documents,
    documentVersions,
    documentPermissions,
    projects,
    projectTasks,
    projectPhotos,
    projectUpdates,
    projectForms,
    overtimeRecords,
    hoursBank,
    timeOffRequests,
    dc3Records,
    eppCatalog,
    eppRecords,
    tools,
    equipment,
    toolCheckouts,
    equipmentLogs,
    repairRequests,
    purchaseRequisitions,
    announcements,
    vales,
    vacationRequests,
    attendance,
    checkLists,
    checkListItems,
    clientSurveys,
    onboardings,
    onboardingItems,
    auditLogs,
  ] = await Promise.all([
    prisma.role.findMany(),
    prisma.permission.findMany(),
    prisma.rolePermission.findMany(),
    prisma.documentCategory.findMany(),
    prisma.department.findMany(),
    prisma.user.findMany(),
    prisma.employee.findMany(),
    prisma.account.findMany(),
    prisma.session.findMany(),
    prisma.verificationToken.findMany(),
    prisma.systemConfig.findMany(),
    prisma.document.findMany(),
    prisma.documentVersion.findMany(),
    prisma.documentPermission.findMany(),
    prisma.project.findMany(),
    prisma.projectTask.findMany(),
    prisma.projectPhoto.findMany(),
    prisma.projectUpdate.findMany(),
    prisma.projectForm.findMany(),
    prisma.overtimeRecord.findMany(),
    prisma.hoursBank.findMany(),
    prisma.timeOffRequest.findMany(),
    prisma.dC3Record.findMany(),
    prisma.ePPCatalog.findMany(),
    prisma.ePPRecord.findMany(),
    prisma.tool.findMany(),
    prisma.equipment.findMany(),
    prisma.toolCheckout.findMany(),
    prisma.equipmentLog.findMany(),
    prisma.repairRequest.findMany(),
    prisma.purchaseRequisition.findMany(),
    prisma.announcement.findMany(),
    prisma.vale.findMany(),
    prisma.vacationRequest.findMany(),
    prisma.attendance.findMany(),
    prisma.checkList.findMany(),
    prisma.checkListItem.findMany(),
    prisma.clientSurvey.findMany(),
    prisma.onboarding.findMany(),
    prisma.onboardingItem.findMany(),
    prisma.auditLog.findMany(),
  ])

  const now = new Date().toISOString().slice(0, 19).replace("T", " ")
  const date = new Date().toISOString().slice(0, 10)

  const sql = [
    `-- Respaldo RIM Intranet`,
    `-- Generado: ${now}`,
    `-- `,
    ``,
    `SET FOREIGN_KEY_CHECKS=0;`,
    `SET SQL_MODE='NO_AUTO_VALUE_ON_ZERO';`,
    ``,
    toInserts("Role", roles as Record<string, unknown>[]),
    toInserts("Permission", permissions as Record<string, unknown>[]),
    toInserts("RolePermission", rolePermissions as Record<string, unknown>[]),
    toInserts("DocumentCategory", documentCategories as Record<string, unknown>[]),
    toInserts("Department", departments as Record<string, unknown>[]),
    toInserts("User", users as Record<string, unknown>[]),
    toInserts("Employee", employees as Record<string, unknown>[]),
    toInserts("Account", accounts as Record<string, unknown>[]),
    toInserts("Session", sessions as Record<string, unknown>[]),
    toInserts("VerificationToken", verificationTokens as Record<string, unknown>[]),
    toInserts("SystemConfig", systemConfigs as Record<string, unknown>[]),
    toInserts("Document", documents as Record<string, unknown>[]),
    toInserts("DocumentVersion", documentVersions as Record<string, unknown>[]),
    toInserts("DocumentPermission", documentPermissions as Record<string, unknown>[]),
    toInserts("Project", projects as Record<string, unknown>[]),
    toInserts("ProjectTask", projectTasks as Record<string, unknown>[]),
    toInserts("ProjectPhoto", projectPhotos as Record<string, unknown>[]),
    toInserts("ProjectUpdate", projectUpdates as Record<string, unknown>[]),
    toInserts("ProjectForm", projectForms as Record<string, unknown>[]),
    toInserts("OvertimeRecord", overtimeRecords as Record<string, unknown>[]),
    toInserts("HoursBank", hoursBank as Record<string, unknown>[]),
    toInserts("TimeOffRequest", timeOffRequests as Record<string, unknown>[]),
    toInserts("DC3Record", dc3Records as Record<string, unknown>[]),
    toInserts("EPPCatalog", eppCatalog as Record<string, unknown>[]),
    toInserts("EPPRecord", eppRecords as Record<string, unknown>[]),
    toInserts("Tool", tools as Record<string, unknown>[]),
    toInserts("Equipment", equipment as Record<string, unknown>[]),
    toInserts("ToolCheckout", toolCheckouts as Record<string, unknown>[]),
    toInserts("EquipmentLog", equipmentLogs as Record<string, unknown>[]),
    toInserts("RepairRequest", repairRequests as Record<string, unknown>[]),
    toInserts("PurchaseRequisition", purchaseRequisitions as Record<string, unknown>[]),
    toInserts("Announcement", announcements as Record<string, unknown>[]),
    toInserts("Vale", vales as Record<string, unknown>[]),
    toInserts("VacationRequest", vacationRequests as Record<string, unknown>[]),
    toInserts("Attendance", attendance as Record<string, unknown>[]),
    toInserts("CheckList", checkLists as Record<string, unknown>[]),
    toInserts("CheckListItem", checkListItems as Record<string, unknown>[]),
    toInserts("ClientSurvey", clientSurveys as Record<string, unknown>[]),
    toInserts("Onboarding", onboardings as Record<string, unknown>[]),
    toInserts("OnboardingItem", onboardingItems as Record<string, unknown>[]),
    toInserts("AuditLog", auditLogs as Record<string, unknown>[]),
    `SET FOREIGN_KEY_CHECKS=1;`,
    ``,
    `-- Fin del respaldo`,
  ].join("\n")

  return new Response(sql, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="rim_intranet_backup_${date}.sql"`,
    },
  })
}
