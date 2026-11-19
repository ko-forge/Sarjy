const upstream = (process.env.API_UPSTREAM || "http://83.147.38.240:8000").replace(/\/$/, "")

export const config = {
  api: { bodyParser: false },
  maxDuration: 60,
}

export default async function handler(req, res) {
  const target = upstream + (req.url || "/api/")
  const headers = new Headers()
  if (req.headers.authorization) headers.set("authorization", req.headers.authorization)
  if (req.headers["content-type"]) headers.set("content-type", req.headers["content-type"])
  if (req.headers.accept) headers.set("accept", req.headers.accept)

  const init = { method: req.method, headers }
  if (req.method !== "GET" && req.method !== "HEAD") {
    const chunks = []
    for await (const chunk of req) chunks.push(chunk)
    init.body = Buffer.concat(chunks)
  }

  try {
    const response = await fetch(target, init)
    res.status(response.status)
    const contentType = response.headers.get("content-type")
    if (contentType) res.setHeader("content-type", contentType)
    res.send(Buffer.from(await response.arrayBuffer()))
  } catch {
    res.status(502).json({ detail: "The API on the VPS did not respond." })
  }
}
