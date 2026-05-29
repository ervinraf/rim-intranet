# RIM Rigging Intranet - Contexto del proyecto

## Stack
Next.js, Prisma, NextAuth, Vercel Blob, Resend (email), Tailwind CSS

## Ruta del proyecto
`/Users/ervinraf/proyectos/claude-webkit/intranet/`

## Ultimo checkpoint (2026-05-20)
Ultimo commit: `21b4def` — fix: horas visible for all employees; asistencia filtered by department for gerente

## Funcionalidades implementadas

- **Gantt chart**: portal cliente publico por token (`/cliente?token=...`), sin login requerido
- **Proyectos**: compartir por email (Resend) y WhatsApp con link del portal cliente
- **Horas overtime**: banco de horas con expiracion automatica, acceso para cualquier usuario con employeeId
- **Asistencia**: Gerentes ven solo su departamento; SuperAdmins ven todo
- **Documentos**: upload (Vercel Blob), eliminacion con boton Trash2, manejo de errores de storage
- **Fechas**: utilidad `fmtDate` propia (reemplazo de date-fns con locale es)
- **Roles**: SUPERADMIN, ADMIN, GERENTE, OPERATIVO -- control de acceso por rol en cada modulo

## Pendiente / siguiente paso
- Integracion de Blue Cascade (gestion de equipos) al intranet
  - Menu lateral unificado con modulo de equipos
  - Vistas por rol para equipos y mantenimiento
  - Flujo de mantenimiento preventivo/correctivo

## Patrones importantes

- Auth: `getServerSession(authOptions)` en server components, `useSession()` en cliente
- API routes en `/src/app/api/`
- Dashboard pages en `/src/app/(intranet)/dashboard/`
- Portal cliente en `/src/app/cliente/`
- Prisma schema en `/prisma/schema.prisma`
