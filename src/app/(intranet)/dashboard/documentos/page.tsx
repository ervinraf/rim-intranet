import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { DocumentsClient } from "./documents-client"
import { resolveDocumentAccess } from "@/lib/document-access"

export default async function DocumentosPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")

  let userDeptId: string | null = null
  if (session.user.employeeId && !isAdmin) {
    const emp = await prisma.employee.findUnique({
      where: { id: session.user.employeeId },
      select: { departmentId: true },
    })
    userDeptId = emp?.departmentId ?? null
  }

  const [departments, categories, rawDocs] = await Promise.all([
    prisma.department.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.documentCategory.findMany({ orderBy: { name: "asc" } }),
    prisma.document.findMany({
      where: {
        isActive: true,
        ...(!isAdmin
          ? {
              OR: [
                { departmentId: userDeptId ?? "__none__" },
                { permissions: { some: { employeeId: session.user.employeeId ?? "__none__" } } },
              ],
            }
          : {}),
      },
      include: {
        department: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        permissions: session.user.employeeId
          ? { where: { employeeId: session.user.employeeId }, select: { level: true } }
          : false,
        _count: { select: { versions: true } },
      },
      orderBy: [{ departmentId: "asc" }, { name: "asc" }],
    }),
  ])

  const documents = rawDocs.map((doc) => {
    const individual = (doc as any).permissions?.[0]?.level ?? null
    const effectiveLevel = resolveDocumentAccess({
      userRole: session.user.role ?? "",
      userDepartmentId: userDeptId,
      documentDepartmentId: doc.departmentId,
      individualPermission: individual,
    })
    return { ...doc, effectiveLevel, permissions: undefined }
  })

  return (
    <DocumentsClient
      documents={JSON.parse(JSON.stringify(documents))}
      departments={departments}
      categories={categories}
      isAdmin={isAdmin}
      userDeptId={userDeptId}
    />
  )
}
