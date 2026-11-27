import { strict as assert } from "node:assert";
import { test } from "node:test";
import worker from "../server/github-keepsake-worker.mjs";

const env = {
  ALLOWED_ORIGIN: "https://birthday.example",
  GITHUB_TOKEN: "test-token-not-real",
  GITHUB_OWNER: "rex",
  GITHUB_REPO: "birthday-keepsakes",
};
const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);

test("worker rejects requests from other origins", async () => {
  const res = await worker.fetch(new Request("https://worker.example", {
    method: "POST", headers: { Origin: "https://not-allowed.example", "Content-Type": "image/png" }, body: png,
  }), env);
  assert.equal(res.status, 403);
});

test("worker saves a PNG in GitHub with a server-only token", async () => {
  const originalFetch = globalThis.fetch;
  let captured;
  globalThis.fetch = async (url, options) => {
    captured = { url, options };
    return new Response(JSON.stringify({ content: { path: "birthday-keepsakes/test.png" } }), { status: 201 });
  };
  try {
    const res = await worker.fetch(new Request("https://worker.example", {
      method: "POST",
      headers: { Origin: env.ALLOWED_ORIGIN, "Content-Type": "image/png" },
      body: png,
    }), env);
    assert.equal(res.status, 201);
    assert.equal(res.headers.get("Access-Control-Allow-Origin"), env.ALLOWED_ORIGIN);
    assert.match(captured.url, /^https:\/\/api\.github\.com\/repos\/rex\/birthday-keepsakes\/contents\/birthday-keepsakes\//);
    assert.equal(captured.options.headers.Authorization, `Bearer ${env.GITHUB_TOKEN}`);
    assert.equal(JSON.parse(captured.options.body).content, Buffer.from(png).toString("base64"));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("worker rejects non-PNG uploads", async () => {
  const res = await worker.fetch(new Request("https://worker.example", {
    method: "POST", headers: { Origin: env.ALLOWED_ORIGIN, "Content-Type": "text/plain" }, body: "hello",
  }), env);
  assert.equal(res.status, 415);
});