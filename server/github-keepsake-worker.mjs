// Deploy as a Cloudflare Worker. Keep GITHUB_TOKEN as a Worker secret, not in
// the static webpage. See server/GITHUB_SETUP.md for deployment instructions.
const MAX_BYTES = 5 * 1024 * 1024;

function cors(origin, allowed) {
  return {
    "Access-Control-Allow-Origin": origin === allowed ? origin : "null",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Photo-Name",
    Vary: "Origin",
  };
}

function json(body, status, headers) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function encodeBase64(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = cors(origin, env.ALLOWED_ORIGIN);

    if (origin !== env.ALLOWED_ORIGIN) return json({ error: "Origin not allowed" }, 403, headers);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (request.method !== "POST") return json({ error: "Method not allowed" }, 405, headers);
    if (!env.GITHUB_TOKEN || !env.GITHUB_OWNER || !env.GITHUB_REPO) {
      return json({ error: "Server not configured" }, 503, headers);
    }
    if (request.headers.get("Content-Type") !== "image/png") {
      return json({ error: "PNG required" }, 415, headers);
    }
    const length = Number(request.headers.get("Content-Length") || 0);
    if (length > MAX_BYTES) return json({ error: "Photo too large" }, 413, headers);

    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_BYTES ||
        bytes[0] !== 137 || bytes[1] !== 80 || bytes[2] !== 78 || bytes[3] !== 71) {
      return json({ error: "Invalid PNG or photo too large" }, 400, headers);
    }

    const id = crypto.randomUUID();
    const date = new Date().toISOString().slice(0, 10);
    const path = `birthday-keepsakes/${date}/${id}.png`;
    const api = `https://api.github.com/repos/${encodeURIComponent(env.GITHUB_OWNER)}/${encodeURIComponent(env.GITHUB_REPO)}/contents/${path}`;
    const result = await fetch(api, {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "birthday-keepsake-worker",
      },
      body: JSON.stringify({
        message: `Add birthday keepsake ${id}`,
        content: encodeBase64(bytes),
        ...(env.GITHUB_BRANCH ? { branch: env.GITHUB_BRANCH } : {}),
      }),
    });
    if (!result.ok) return json({ error: `GitHub returned ${result.status}` }, 502, headers);
    return json({ saved: true }, 201, headers);
  },
};