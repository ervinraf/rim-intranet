import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Star } from "lucide-react"

export default async function EncuestasPage() {
  const session = await auth()
  if (!session?.user) redirect("/login")

  const isAdmin = ["SUPERADMIN", "ADMIN", "GERENTE"].includes(session.user.role ?? "")
  if (!isAdmin) redirect("/dashboard")

  const surveys = await prisma.clientSurvey.findMany({
    include: { project: { select: { name: true, clientName: true } } },
    orderBy: { submittedAt: "desc" },
    take: 200,
  })

  const avgRating = surveys.length
    ? (surveys.reduce((s, r) => s + r.rating, 0) / surveys.length).toFixed(1)
    : "—"

  const byRating = [5, 4, 3, 2, 1].map((r) => ({
    stars: r,
    count: surveys.filter((s) => s.rating === r).length,
  }))

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Encuestas de satisfaccion</h1>
        <p className="text-sm text-slate-500 mt-0.5">{surveys.length} respuesta(s) recibidas</p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 flex items-center gap-4">
          <div className="text-5xl font-bold text-slate-900">{avgRating}</div>
          <div>
            <div className="flex gap-0.5 mb-1">
              {[1,2,3,4,5].map((s) => (
                <Star
                  key={s}
                  className={`w-5 h-5 ${s <= Math.round(Number(avgRating)) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                />
              ))}
            </div>
            <p className="text-sm text-slate-500">Promedio general</p>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-1.5">
          {byRating.map(({ stars, count }) => (
            <div key={stars} className="flex items-center gap-2">
              <span className="text-xs text-slate-500 w-4">{stars}</span>
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full"
                  style={{ width: surveys.length ? `${(count / surveys.length) * 100}%` : "0%" }}
                />
              </div>
              <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {surveys.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">Sin encuestas recibidas</p>
        )}
        {surveys.map((s) => (
          <div key={s.id} className="bg-white border border-slate-200 rounded-xl px-4 py-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium text-slate-900">{s.clientName}</p>
                <p className="text-xs text-slate-500">
                  {s.project.name} · {s.project.clientName} ·{" "}
                  {format(new Date(s.submittedAt), "d MMM yyyy", { locale: es })}
                </p>
                {s.comment && (
                  <p className="text-sm text-slate-600 mt-1.5 italic">"{s.comment}"</p>
                )}
              </div>
              <div className="flex gap-0.5 flex-shrink-0 ml-4">
                {[1,2,3,4,5].map((star) => (
                  <Star
                    key={star}
                    className={`w-4 h-4 ${star <= s.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
