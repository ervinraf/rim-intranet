import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"

const LEVANTAMIENTO_FIELDS = [
  { key: "fecha", label: "Fecha de levantamiento" },
  { key: "responsable", label: "Responsable RIM" },
  { key: "cliente", label: "Cliente / Empresa" },
  { key: "contactoCliente", label: "Contacto del cliente" },
  { key: "ubicacion", label: "Ubicacion / Direccion" },
  { key: "tipoDeTrabajo", label: "Tipo de trabajo" },
  { key: "descripcionCarga", label: "Descripcion de la carga" },
  { key: "pesoCarga", label: "Peso de la carga" },
  { key: "dimensionesCarga", label: "Dimensiones de la carga" },
  { key: "radioIzaje", label: "Radio de izaje" },
  { key: "alturaMaxima", label: "Altura maxima" },
  { key: "equipoRequerido", label: "Equipo requerido" },
  { key: "accesoSitio", label: "Condiciones de acceso" },
  { key: "obstaculos", label: "Obstaculos identificados" },
  { key: "condicionesSuelo", label: "Condiciones del suelo" },
  { key: "certificacionesRequeridas", label: "Certificaciones requeridas" },
  { key: "observaciones", label: "Observaciones adicionales" },
]

const CIERRE_FIELDS = [
  { key: "fechaCierre", label: "Fecha de cierre" },
  { key: "responsable", label: "Responsable RIM" },
  { key: "trabajoRealizado", label: "Trabajo realizado" },
  { key: "equipoUtilizado", label: "Equipo utilizado" },
  { key: "horasTrabajadas", label: "Horas trabajadas" },
  { key: "personalInvolucrado", label: "Personal involucrado" },
  { key: "equipoDevuelto", label: "Equipo devuelto a almacen" },
  { key: "incidencias", label: "Incidencias" },
  { key: "satisfaccionCliente", label: "Satisfaccion del cliente (1-5)" },
  { key: "comentariosCliente", label: "Comentarios del cliente" },
  { key: "recomendaciones", label: "Recomendaciones" },
  { key: "observacionesFinales", label: "Observaciones finales" },
]

export default async function FormatoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const [form, configs] = await Promise.all([
    prisma.projectForm.findUnique({
      where: { id },
      include: {
        project: { select: { name: true, clientName: true, location: true } },
        createdBy: { select: { name: true } },
      },
    }),
    prisma.systemConfig.findMany({ where: { key: { in: ["company_name", "company_logo"] } } }),
  ])

  if (!form) notFound()

  const data = form.data as Record<string, string>
  const cfg = Object.fromEntries(configs.map((c) => [c.key, c.value]))
  const companyName = cfg.company_name ?? "RIM Rigging"
  const companyLogo = cfg.company_logo ?? null
  const fields = form.type === "LEVANTAMIENTO" ? LEVANTAMIENTO_FIELDS : CIERRE_FIELDS
  const formTitle = form.type === "LEVANTAMIENTO" ? "FORMATO DE LEVANTAMIENTO" : "FORMATO DE CIERRE DE PROYECTO"

  return (
    <html lang="es">
      <head>
        <title>{formTitle} — {form.project.name}</title>
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, sans-serif; font-size: 11px; color: #1e293b; background: white; }
          .page { max-width: 750px; margin: 0 auto; padding: 28px; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; }
          .logo { height: 38px; object-fit: contain; }
          .logo-placeholder { width: 38px; height: 38px; background: #f59e0b; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; }
          .title { font-size: 16px; font-weight: 700; text-align: center; margin-bottom: 4px; text-transform: uppercase; }
          .project-info { background: #f8fafc; border-radius: 8px; padding: 10px 14px; margin-bottom: 18px; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
          .project-field { }
          .project-label { font-size: 9px; color: #64748b; text-transform: uppercase; }
          .project-value { font-weight: 600; font-size: 12px; }
          .fields { }
          .field { border-bottom: 1px solid #e2e8f0; padding: 7px 0; display: grid; grid-template-columns: 200px 1fr; gap: 10px; }
          .field-label { color: #475569; font-size: 10px; font-weight: 500; padding-top: 1px; }
          .field-value { font-weight: 500; min-height: 16px; }
          .field-empty { color: #cbd5e1; }
          .signatures { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 30px; margin-top: 40px; }
          .sig { text-align: center; }
          .sig-line { border-top: 1px solid #0f172a; padding-top: 5px; font-size: 10px; color: #64748b; }
          .footer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 9px; color: #94a3b8; }
          @media print { body { print-color-adjust: exact; } }
        `}</style>
      </head>
      <body>
        <div className="page">
          <div className="header">
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              {companyLogo ? (
                <img src={companyLogo} alt={companyName} className="logo" />
              ) : (
                <div className="logo-placeholder">{companyName.slice(0, 2)}</div>
              )}
              <div>
                <p style={{ fontWeight: 700, fontSize: 13 }}>{companyName}</p>
                <p style={{ color: "#64748b", fontSize: 10 }}>
                  {form.type === "LEVANTAMIENTO" ? "Operaciones" : "Cierre de proyectos"}
                </p>
              </div>
            </div>
            <div style={{ textAlign: "right", fontSize: 10 }}>
              <p style={{ color: "#64748b" }}>Folio</p>
              <p style={{ fontWeight: 700, fontFamily: "monospace" }}>
                {form.type === "LEVANTAMIENTO" ? "FL" : "FC"}-{id.slice(-8).toUpperCase()}
              </p>
              <p style={{ color: "#64748b", marginTop: 4 }}>
                {format(new Date(form.createdAt), "d MMM yyyy", { locale: es })}
              </p>
            </div>
          </div>

          <div className="title">{formTitle}</div>

          <div className="project-info">
            <div className="project-field">
              <div className="project-label">Proyecto</div>
              <div className="project-value">{form.project.name}</div>
            </div>
            <div className="project-field">
              <div className="project-label">Cliente</div>
              <div className="project-value">{form.project.clientName}</div>
            </div>
            {form.project.location && (
              <div className="project-field">
                <div className="project-label">Ubicacion</div>
                <div className="project-value">{form.project.location}</div>
              </div>
            )}
            {form.createdBy.name && (
              <div className="project-field">
                <div className="project-label">Elaborado por</div>
                <div className="project-value">{form.createdBy.name}</div>
              </div>
            )}
          </div>

          <div className="fields">
            {fields.map((f) => (
              <div key={f.key} className="field">
                <div className="field-label">{f.label}</div>
                <div className={`field-value ${!data[f.key] ? "field-empty" : ""}`}>
                  {data[f.key] || "—"}
                </div>
              </div>
            ))}
          </div>

          <div className="signatures">
            <div className="sig">
              <div style={{ height: 44 }} />
              <div className="sig-line">Elaboro</div>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>{form.createdBy.name ?? ""}</div>
            </div>
            <div className="sig">
              <div style={{ height: 44 }} />
              <div className="sig-line">Autorizo</div>
            </div>
            <div className="sig">
              <div style={{ height: 44 }} />
              <div className="sig-line">Cliente / Vo.Bo.</div>
            </div>
          </div>

          <div className="footer">
            {companyName} · {formTitle} · Folio: {form.type === "LEVANTAMIENTO" ? "FL" : "FC"}-{id.slice(-8).toUpperCase()}
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: "window.onload = () => window.print()" }} />
      </body>
    </html>
  )
}
