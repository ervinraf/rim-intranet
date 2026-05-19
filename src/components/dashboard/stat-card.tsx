import Link from "next/link"

interface StatCardProps {
  label: string
  value: number | string
  icon: React.ElementType
  href: string
  alert?: boolean
  large?: boolean
  description?: string
}

export function StatCard({ label, value, icon: Icon, href, alert, large, description }: StatCardProps) {
  return (
    <Link
      href={href}
      className={`block border rounded-2xl p-4 transition-all stat-card-3d ${large ? "col-span-full" : ""}`}
      style={alert ? {
        background: "linear-gradient(160deg, #fffbeb 0%, #fef9e7 100%)",
        borderColor: "rgba(251,191,36,.35)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,.9), 0 4px 12px rgba(245,158,11,.1), 0 12px 24px rgba(245,158,11,.06)",
      } : undefined}
    >
      <div className="flex items-center justify-between mb-3">
        <p className={`text-xs font-medium ${alert ? "text-amber-700" : "text-slate-500"}`}>{label}</p>
        <div
          className={`w-8 h-8 rounded-xl flex items-center justify-center`}
          style={alert ? {
            background: "linear-gradient(135deg, rgba(251,191,36,.25) 0%, rgba(245,158,11,.15) 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.6), 0 2px 4px rgba(245,158,11,.15)",
          } : {
            background: "linear-gradient(135deg, rgba(241,245,249,.9) 0%, rgba(226,232,240,.7) 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,.8), 0 1px 3px rgba(15,23,42,.08)",
          }}
        >
          <Icon className={`w-4 h-4 ${alert ? "text-amber-600" : "text-slate-400"}`} />
        </div>
      </div>
      <p className={`font-bold ${large ? "text-3xl" : "text-2xl"} ${alert ? "text-amber-900" : "text-slate-900"}`}>
        {value}
      </p>
      {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
      {alert && typeof value === "number" && value > 0 && (
        <p className="text-xs text-amber-600 mt-1 font-medium">Requiere atencion</p>
      )}
    </Link>
  )
}
