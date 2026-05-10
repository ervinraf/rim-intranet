import { put } from "@vercel/blob"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN

export async function uploadFile(
  file: File,
  folder: string,
  filename: string
): Promise<string> {
  if (useBlob) {
    const blob = await put(`${folder}/${filename}`, file, { access: "public" })
    return blob.url
  }

  // Filesystem (dev local)
  const dir = path.join(process.cwd(), "public", "uploads", folder)
  await mkdir(dir, { recursive: true })
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()))
  return `/uploads/${folder}/${filename}`
}
