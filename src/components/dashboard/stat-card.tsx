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
    <Link href={href} className={`block bg-white border rounded-xl p-4 hover:shadow-sm transition-all ${
      alert ? "border-amber-200 bg-amber-50" : "border-slate-200"
    } ${large ? "col-span-full" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`text-xs font-medium ${alert ? "text-amber-700" : "text-slate-500"}`}>{label}</p>
        <Icon className={`w-4 h-4 ${alert ? "text-amber-500" : "text-slate-400"}`} />
      </div>
      <p className={`font-bold ${large ? "text-3xl" : "text-2xl"} ${alert ? "text-amber-900" : "text-slate-900"}`}>
        {value}
      </p>
      {description && <p className="text-xs text-slate-400 mt-1">{description}</p>}
      {alert && typeof value === "number" && value > 0 && (
        <p className="text-xs text-amber-600 mt-1">Requiere atencion</p>
      )}
    </Link>
  )
}
