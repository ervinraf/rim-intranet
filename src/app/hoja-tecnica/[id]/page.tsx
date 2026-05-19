export const dynamic = 'force-dynamic'

import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"

export default async function HojaTecnicaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [equipment, configs] = await Promise.all([
    prisma.equipment.findUnique({
      where: { id },
      include: {
        department: { select: { name: true } },
        project: { select: { name: true } },
        logs: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    }),
    prisma.systemConfig.findMany({ where: { key: { in: ["company_name", "company_logo"] } } }),
  ])

  if (!equipment) notFound()

  const cfg = Object.fromEntries(configs.map((c) => [c.key, c.value]))
  const companyName = cfg.company_name ?? "RIM Rigging"
  const companyLogo = cfg.company_logo ?? null
  const specs = (equipment.technicalSpecs as Record<string, string>) ?? {}

  const specFields = [
    ["noEconomico", "No. Economico"],
    ["capacidad", "Capacidad"],
    ["pesoBruto", "Peso bruto"],
    ["dimensiones", "Dimensiones"],
    ["potencia", "Potencia"],
    ["voltaje", "Voltaje"],
    ["combustible", "Combustible"],
    ["certificaciones", "Certificaciones"],
    ["añoFabricacion", "Año de fabricacion"],
  ]

  const logTypeLabels: Record<string, string> = {
    SERVICIO: "Servicio", INSPECCION: "Inspeccion", INCIDENCIA: "Incidencia",
    ENTREGA: "Entrega", RECEPCION: "Recepcion", REPARACION: "Reparacion",
  }

  return (
    <html lang="es">
      <head>
        <title>Hoja Tecnica — {equipment.name}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, sans-serif; font-size: 12px; color: #1e293b; background: white; }
          .page { max-width: 800px; margin: 0 auto; padding: 32px; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 24px; }
          .logo { height: 40px; object-fit: contain; }
          .logo-placeholder { width: 40px; height: 40px; background: #f59e0b; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; }
          h1 { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
          h2 { font-size: 13px; font-weight: 600; color: #475569; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; }
          .section { margin-bottom: 24px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .field { padding: 8px 12px; background: #f8fafc; border-radius: 6px; }
          .field-label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 2px; }
          .field-value { font-weight: 500; }
          .status { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 11px; font-weight: 600; }
          .log-row { display: flex; gap: 12px; padding: 6px 0; border-bottom: 1px solid #f1f5f9; font-size: 11px; }
          .log-date { color: #94a3b8; min-width: 60px; }
          .log-type { background: #f1f5f9; padding: 1px 8px; border-radius: 4px; color: #475569; }
          .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
          @media print { body { print-color-adjust: exact; } }
        `}</style>
      </head>
      <body>
        <div className="page">
          <div className="header">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="logo" />
              ) : (
                <div className="logo-placeholder">{companyName.slice(0, 2)}</div>
              )}
              <div>
                <p style={{ fontWeight: 700, fontSize: 14 }}>{companyName}</p>
                <p style={{ color: "#64748b", fontSize: 11 }}>Hoja Tecnica de Equipo</p>
              </div>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ color: "#64748b", fontSize: 11 }}>Fecha de impresion</p>
              <p style={{ fontWeight: 500 }}>{format(new Date(), "d 'de' MMMM yyyy", { locale: es })}</p>
            </div>
          </div>

          {/* Identificacion */}
          <div className="section">
            <h1>{equipment.name}</h1>
            <p style={{ color: "#64748b", marginBottom: 16 }}>
              {equipment.brand} {equipment.model}
              {equipment.serialNumber && ` · S/N: ${equipment.serialNumber}`}
              {equipment.code && ` · Cod: ${equipment.code}`}
            </p>
            <div className="grid">
              <div className="field">
                <div className="field-label">Estado actual</div>
                <div className="field-value">{equipment.status.replace("_", " ")}</div>
              </div>
              <div className="field">
                <div className="field-label">Departamento</div>
                <div className="field-value">{equipment.department?.name ?? "—"}</div>
              </div>
              {equipment.location && (
                <div className="field">
                  <div className="field-label">Ubicacion</div>
                  <div className="field-value">{equipment.location}</div>
                </div>
              )}
              {equipment.nextServiceDate && (
                <div className="field">
                  <div className="field-label">Proximo servicio</div>
                  <div className="field-value">{format(new Date(equipment.nextServiceDate), "d MMM yyyy", { locale: es })}</div>
                </div>
              )}
              {(equipment as any).purchaseDate && (
                <div className="field">
                  <div className="field-label">Fecha de compra</div>
                  <div className="field-value">{format(new Date((equipment as any).purchaseDate), "d MMM yyyy", { locale: es })}</div>
                </div>
              )}
              {(equipment as any).purchasePrice && (
                <div className="field">
                  <div className="field-label">Costo de compra</div>
                  <div className="field-value">${Number((equipment as any).purchasePrice).toLocaleString("es-MX")}</div>
                </div>
              )}
            </div>
          </div>

          {/* Especificaciones tecnicas */}
          {specFields.some(([key]) => specs[key]) && (
            <div className="section">
              <h2>Especificaciones tecnicas</h2>
              <div className="grid">
                {specFields.filter(([key]) => specs[key]).map(([key, label]) => (
                  <div key={key} className="field">
                    <div className="field-label">{label}</div>
                    <div className="field-value">{specs[key]}</div>
                  </div>
                ))}
              </div>
              {specs.observaciones && (
                <div className="field" style={{ marginTop: 8 }}>
                  <div className="field-label">Observaciones</div>
                  <div className="field-value">{specs.observaciones}</div>
                </div>
              )}
            </div>
          )}

          {/* Bitacora */}
          {equipment.logs.length > 0 && (
            <div className="section">
              <h2>Bitacora de servicio (ultimos {equipment.logs.length} eventos)</h2>
              {equipment.logs.map((log) => (
                <div key={log.id} className="log-row">
                  <span className="log-date">{format(new Date(log.createdAt), "d MMM yy", { locale: es })}</span>
                  <span className="log-type">{logTypeLabels[log.type] ?? log.type}</span>
                  <span style={{ flex: 1 }}>{log.description}</span>
                </div>
              ))}
            </div>
          )}

          {equipment.notes && (
            <div className="section">
              <h2>Notas</h2>
              <p style={{ color: "#475569" }}>{equipment.notes}</p>
            </div>
          )}

          <div className="footer">
            {companyName} · Documento generado el {format(new Date(), "d 'de' MMMM yyyy HH:mm", { locale: es })}
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: "window.onload = () => window.print()" }} />
      </body>
    </html>
  )
}
