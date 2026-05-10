import { PrismaClient, EmployeeType } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const MODULES = [
  "users", "employees", "departments", "roles",
  "documents", "overtime", "timeoff", "projects",
  "inventory", "tools", "equipment", "requisitions",
  "dc3", "epp", "logs", "config",
]

const ACTIONS = ["create", "read", "update", "delete", "approve"]

async function main() {
  console.log("Seeding database...")

  // Permisos
  const permissions = await Promise.all(
    MODULES.flatMap((module) =>
      ACTIONS.map((action) =>
        prisma.permission.upsert({
          where: { module_action: { module, action } },
          update: {},
          create: { module, action, description: `${action} ${module}` },
        })
      )
    )
  )

  // Roles del sistema
  const superadminRole = await prisma.role.upsert({
    where: { name: "SUPERADMIN" },
    update: {},
    create: {
      name: "SUPERADMIN",
      description: "Acceso total al sistema",
      isSystem: true,
    },
  })

  const adminRole = await prisma.role.upsert({
    where: { name: "ADMIN" },
    update: {},
    create: {
      name: "ADMIN",
      description: "Administrador de empresa",
      isSystem: true,
    },
  })

  const managerRole = await prisma.role.upsert({
    where: { name: "GERENTE" },
    update: {},
    create: {
      name: "GERENTE",
      description: "Gerente de departamento",
      isSystem: true,
    },
  })

  const employeeRole = await prisma.role.upsert({
    where: { name: "EMPLEADO" },
    update: {},
    create: {
      name: "EMPLEADO",
      description: "Empleado operativo",
      isSystem: true,
    },
  })

  const clientRole = await prisma.role.upsert({
    where: { name: "CLIENTE" },
    update: {},
    create: {
      name: "CLIENTE",
      description: "Cliente externo — solo su proyecto",
      isSystem: true,
    },
  })

  // Superadmin tiene todos los permisos
  await Promise.all(
    permissions.map((p) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: superadminRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: superadminRole.id, permissionId: p.id },
      })
    )
  )

  // Admin — todo excepto config y roles
  const adminPerms = permissions.filter(
    (p) => !["roles", "config"].includes(p.module) || p.action === "read"
  )
  await Promise.all(
    adminPerms.map((p) =>
      prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: adminRole.id, permissionId: p.id } },
        update: {},
        create: { roleId: adminRole.id, permissionId: p.id },
      })
    )
  )

  // Departamentos base
  const departments = [
    { name: "Recursos Humanos" },
    { name: "Administracion" },
    { name: "Ventas" },
    { name: "Operaciones" },
    { name: "Almacen" },
    { name: "Taller" },
  ]

  for (const dept of departments) {
    await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: dept,
    })
  }

  // Categorias de documentos por departamento
  const docCategories = [
    // RH
    "Descripcion de puestos",
    "Perfiles de empleado",
    "Formatos de nuevo ingreso",
    "Formatos de vacaciones",
    "Control EPP",
    "Control tiempo extra",
    "Cierre de periodo horas extras",
    // Administracion
    "Nomina",
    "Ausencias y descuentos",
    "Aumentos de puesto y salariales",
    "Facturacion y cobranza",
    "Pagos IMSS e impuestos",
    "Pagos a proveedores",
    "Contratos REPSE",
    // Ventas
    "Proyectos",
    "Calendario de proyectos",
    "Formatos de levantamiento",
    "Formatos de cierre de proyecto",
    "Satisfaccion del cliente",
    // Operaciones
    "DC3 por empleado",
    "Listados de equipos",
    "Listados de herramientas",
    "Listados de colaboradores",
    "Formatos check list",
    "Bitacoras de equipo",
    // Almacen
    "Vales de salida",
    "Herramienta solicitada",
    // Taller
    "Hojas tecnicas del equipo",
    "Bitacoras de servicio",
    "Entrega y recepcion de equipos",
    "Solicitud de reparacion",
  ]

  for (const name of docCategories) {
    await prisma.documentCategory.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  // Configuracion del sistema
  const configs = [
    { key: "company_name", value: "RIM Rigging", description: "Nombre de la empresa" },
    { key: "hours_bank_expiration_months", value: "6", description: "Meses para que venzan las horas del banco (0 = nunca)" },
    { key: "overtime_weekly_limit", value: "9", description: "Limite de horas extras semanales antes de aplicar triple" },
    { key: "overtime_double_multiplier", value: "2", description: "Multiplicador para horas dobles" },
    { key: "overtime_triple_multiplier", value: "3", description: "Multiplicador para horas triples" },
    { key: "working_hours_per_day", value: "8", description: "Horas de jornada laboral" },
  ]

  for (const cfg of configs) {
    await prisma.systemConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: cfg,
    })
  }

  // Usuario superadmin inicial
  const passwordHash = await bcrypt.hash("RimRigging2026!", 10)
  const superadminUser = await prisma.user.upsert({
    where: { email: "admin@rim-rigging.com" },
    update: {},
    create: {
      email: "admin@rim-rigging.com",
      name: "Administrador",
      passwordHash,
      isActive: true,
    },
  })

  const rhDept = await prisma.department.findUnique({ where: { name: "Recursos Humanos" } })

  await prisma.employee.upsert({
    where: { userId: superadminUser.id },
    update: {},
    create: {
      userId: superadminUser.id,
      paterno: "Admin",
      nombres: "Sistema",
      fullName: "Administrador Sistema",
      employeeType: EmployeeType.ADMINISTRATIVO,
      departmentId: rhDept?.id,
      roleId: superadminRole.id,
    },
  })

  // Catalogo EPP para personal de rigging
  const eppItems = [
    "Casco de seguridad",
    "Botas de seguridad con casquillo",
    "Arnes de cuerpo completo",
    "Eslingas de seguridad",
    "Guantes de trabajo",
    "Guantes de cuero",
    "Lentes de seguridad",
    "Careta de seguridad",
    "Chaleco de seguridad reflectante",
    "Protectores auditivos",
    "Mascarilla respiratoria",
    "Rodilleras",
    "Faja lumbar",
    "Cubre piernas",
    "Ropa de trabajo (uniforme)",
    "Impermeable",
  ]

  for (const name of eppItems) {
    await prisma.ePPCatalog.upsert({
      where: { name },
      update: {},
      create: { name },
    })
  }

  console.log("Seed completado.")
  console.log("Login inicial: admin@rim-rigging.com / RimRigging2026!")
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
