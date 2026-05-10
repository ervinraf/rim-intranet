/**
 * Reglas de acceso a documentos:
 *
 * 1. SUPERADMIN / ADMIN → acceso total a todos los documentos
 * 2. GERENTE → acceso total a documentos de su departamento
 * 3. Empleado → acceso a documentos de su departamento (nivel VER por default)
 * 4. Permiso individual en DocumentPermission sobreescribe el acceso por departamento
 *
 * Jerarquia de niveles: DESCARGAR > EDITAR > COMENTAR > VER
 */

export type PermissionLevel = "VER" | "COMENTAR" | "EDITAR" | "DESCARGAR"

const LEVEL_RANK: Record<PermissionLevel, number> = {
  VER: 1,
  COMENTAR: 2,
  EDITAR: 3,
  DESCARGAR: 4,
}

export function hasPermission(
  userLevel: PermissionLevel,
  required: PermissionLevel
): boolean {
  return LEVEL_RANK[userLevel] >= LEVEL_RANK[required]
}

export function resolveDocumentAccess(opts: {
  userRole: string
  userDepartmentId: string | null | undefined
  documentDepartmentId: string | null | undefined
  individualPermission: PermissionLevel | null
}): PermissionLevel | null {
  const { userRole, userDepartmentId, documentDepartmentId, individualPermission } = opts

  // Admin y superadmin ven todo
  if (["SUPERADMIN", "ADMIN"].includes(userRole)) return "DESCARGAR"

  // Permiso individual explícito (puede ser mas restrictivo o mas permisivo)
  if (individualPermission) return individualPermission

  // Sin departamento en el documento → solo admins (ya cubiertos arriba)
  if (!documentDepartmentId) return null

  // Mismo departamento → VER por defecto
  if (userDepartmentId === documentDepartmentId) return "VER"

  // Otro departamento → sin acceso
  return null
}
