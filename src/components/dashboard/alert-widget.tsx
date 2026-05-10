import Link from "next/link"

interface AlertItem {
  id: string
  label: string
  sublabel?: string
  badge?: string
  badgeColor?: string
}

interface AlertWidgetProps {
  title: string
  icon: React.ElementType
  iconColor: string
  bgColor: string
  href: string
  items: AlertItem[]
}

export function AlertWidget({ title, icon: Icon, iconColor, bgColor, href, items }: AlertWidgetProps) {
  if (items.length === 0) return null

  return (
    <div className={`rounded-xl border p-4 ${bgColor}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${iconColor}`} />
          <p className="text-sm font-semibold text-slate-800">{title}</p>
        </div>
        <Link href={href} className="text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2">
          Ver todos
        </Link>
      </div>
      <div className="space-y-2">
        {items.slice(0, 5).map((item) => (
          <div key={item.id} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{item.label}</p>
              {item.sublabel && (
                <p className="text-xs text-slate-500 truncate">{item.sublabel}</p>
              )}
            </div>
            {item.badge && (
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${item.badgeColor}`}>
                {item.badge}
              </span>
            )}
          </div>
        ))}
        {items.length > 5 && (
          <p className="text-xs text-slate-400 text-center pt-1">
            +{items.length - 5} mas
          </p>
        )}
      </div>
    </div>
  )
}
