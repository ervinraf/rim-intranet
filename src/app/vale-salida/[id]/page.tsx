export const dynamic = 'force-dynamic'

import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default async function ValeSalidaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  type CheckoutWithRelations = Awaited<ReturnType<typeof prisma.toolCheckout.findUnique>> & {
    tool: any; employee: any; project: any
  }
  const [checkout, configs] = await Promise.all([
    prisma.toolCheckout.findUnique({
      where: { id },
      include: {
        tool: true,
        employee: { select: { fullName: true, position: true, department: { select: { name: true } } } },
        project: { select: { name: true, clientName: true, location: true } },
      },
    }),
    prisma.systemConfig.findMany({ where: { key: { in: ["company_name", "company_logo"] } } }),
  ])

  if (!checkout) notFound()

  const co = checkout as CheckoutWithRelations
  const cfg = Object.fromEntries(configs.map((c) => [c.key, c.value]))
  const companyName = cfg.company_name ?? "RIM Rigging"
  const companyLogo = cfg.company_logo ?? null

  return (
    <html lang="es">
      <head>
        <title>Vale de Salida — {co.tool.name}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, sans-serif; font-size: 12px; color: #1e293b; background: white; }
          .page { max-width: 700px; margin: 0 auto; padding: 32px; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; }
          .logo { height: 40px; object-fit: contain; }
          .logo-placeholder { width: 40px; height: 40px; background: #f59e0b; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
          .title { font-size: 18px; font-weight: 700; text-align: center; margin-bottom: 4px; }
          .subtitle { font-size: 11px; color: #64748b; text-align: center; margin-bottom: 20px; }
          .folio { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 16px; text-align: center; margin-bottom: 20px; }
          .folio span { font-size: 10px; color: #64748b; display: block; }
          .folio strong { font-size: 14px; font-family: monospace; }
          .section { margin-bottom: 20px; }
          h2 { font-size: 11px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
          .field { border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .field-label { font-size: 10px; color: #64748b; margin-bottom: 2px; }
          .field-value { font-weight: 500; font-size: 13px; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 48px; }
          .sig { text-align: center; }
          .sig-line { border-top: 1px solid #0f172a; padding-top: 6px; font-size: 11px; color: #64748b; }
          .footer { margin-top: 24px; font-size: 10px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 12px; }
          @media print { body { print-color-adjust: exact; } }
        `}</style>
      </head>
      <body>
        <div className="page">
          <div className="header">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="logo" />
              ) : (
                <div className="logo-placeholder">{companyName.slice(0, 2)}</div>
              )}
              <div>
                <p style={{ fontWeight: 700, fontSize: 14 }}>{companyName}</p>
                <p style={{ color: "#64748b", fontSize: 11 }}>Almacen de herramientas</p>
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 11 }}>
              <p style={{ color: "#64748b" }}>Fecha</p>
              <p style={{ fontWeight: 600 }}>{format(new Date(co.checkedOutAt), "d 'de' MMMM yyyy", { locale: es })}</p>
            </div>
          </div>

          <div className="title">VALE DE SALIDA DE HERRAMIENTA</div>
          <div className="subtitle">Almacen · {companyName}</div>

          <div className="folio">
            <span>Folio</span>
            <strong>VS-{id.slice(-8).toUpperCase()}</strong>
          </div>

          <div className="section">
            <h2>Herramienta</h2>
            <div className="grid2">
              <div className="field">
                <div className="field-label">Descripcion</div>
                <div className="field-value">{co.tool.name}</div>
              </div>
              {co.tool.code && (
                <div className="field">
                  <div className="field-label">Codigo</div>
                  <div className="field-value">{co.tool.code}</div>
                </div>
              )}
              {co.tool.brand && (
                <div className="field">
                  <div className="field-label">Marca</div>
                  <div className="field-value">{co.tool.brand}</div>
                </div>
              )}
              {co.tool.serialNumber && (
                <div className="field">
                  <div className="field-label">No. Serie</div>
                  <div className="field-value">{co.tool.serialNumber}</div>
                </div>
              )}
              <div className="field">
                <div className="field-label">Condicion de salida</div>
                <div className="field-value">{co.conditionOut}</div>
              </div>
            </div>
          </div>

          <div className="section">
            <h2>Empleado que recibe</h2>
            <div className="grid2">
              <div className="field">
                <div className="field-label">Nombre</div>
                <div className="field-value">{co.employee.fullName}</div>
              </div>
              {co.employee.position && (
                <div className="field">
                  <div className="field-label">Puesto</div>
                  <div className="field-value">{co.employee.position}</div>
                </div>
              )}
              {co.employee.department && (
                <div className="field">
                  <div className="field-label">Departamento</div>
                  <div className="field-value">{co.employee.department.name}</div>
                </div>
              )}
              {co.project && (
                <div className="field">
                  <div className="field-label">Proyecto</div>
                  <div className="field-value">{co.project.name}</div>
                </div>
              )}
              {co.expectedReturn && (
                <div className="field">
                  <div className="field-label">Fecha esperada de regreso</div>
                  <div className="field-value">{format(new Date(co.expectedReturn), "d 'de' MMMM yyyy", { locale: es })}</div>
                </div>
              )}
            </div>
            {co.notes && (
              <div className="field" style={{ marginTop: 8 }}>
                <div className="field-label">Observaciones</div>
                <div className="field-value">{co.notes}</div>
              </div>
            )}
          </div>

          <div className="signatures">
            <div className="sig">
              <div style={{ height: 48 }} />
              <div className="sig-line">Entregado por (Almacen)</div>
            </div>
            <div className="sig">
              <div style={{ height: 48 }} />
              <div className="sig-line">Recibido por: {co.employee.fullName}</div>
            </div>
          </div>

          <div className="footer">
            El empleado es responsable de la herramienta hasta su devolucion en las condiciones acordadas. · {companyName}
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: "window.onload = () => window.print()" }} />
      </body>
    </html>
  )
}
