import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user || !["SUPERADMIN", "ADMIN"].includes(session.user.role ?? "")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN
  const hasToken = !!token
  const tokenPreview = token ? `${token.slice(0, 20)}...` : null

  try {
    const { put } = await import("@vercel/blob")
    const testContent = new Blob(["test"], { type: "text/plain" })
    const result = await put("_test/connection-check.txt", testContent, { access: "public" })
    return NextResponse.json({ ok: true, hasToken, tokenPreview, url: result.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, hasToken, tokenPreview, error: msg }, { status: 500 })
  }
}
