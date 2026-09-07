/**
 * Minting a GitHub App installation token, used only by the optional live permission
 * re-check in `access.ts`. Everything here is skipped when the App secrets are absent.
 */
import type { Env } from "./types";

const API = "https://api.github.com";
const USER_AGENT = "oktech-media-upload";

/** Installation tokens last an hour; re-mint a few minutes early. */
const TOKEN_MARGIN_MS = 5 * 60 * 1000;

let cached: { token: string; expiresAt: number } | null = null;

const base64url = (bytes: Uint8Array): string =>
  btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

const encodeJson = (value: unknown): string =>
  base64url(new TextEncoder().encode(JSON.stringify(value)));

/**
 * Decode a PKCS#8 PEM. GitHub hands out PKCS#1 (`BEGIN RSA PRIVATE KEY`), which WebCrypto
 * cannot import — convert it once with
 * `openssl pkcs8 -topk8 -nocrypt -in key.pem -out key.pkcs8.pem`.
 */
function decodePkcs8(pem: string): ArrayBuffer | null {
  const body = pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, "");

  if (!pem.includes("BEGIN PRIVATE KEY") || !body) {
    return null;
  }

  try {
    return Uint8Array.from(atob(body), (char) => char.charCodeAt(0)).buffer;
  } catch {
    return null;
  }
}

/** Short-lived App JWT (RS256), the credential used to ask for an installation token. */
async function appJwt(appId: string, privateKeyPem: string): Promise<string | null> {
  const pkcs8 = decodePkcs8(privateKeyPem);

  if (!pkcs8) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: "RS256", typ: "JWT" });
  const payload = encodeJson({ iat: now - 60, exp: now + 540, iss: appId });

  const key = await crypto.subtle.importKey(
    "pkcs8",
    pkcs8,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(`${header}.${payload}`),
  );

  return `${header}.${payload}.${base64url(new Uint8Array(signature))}`;
}

const apiGet = (path: string, token: string, method = "GET"): Promise<Response> =>
  fetch(`${API}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": USER_AGENT,
    },
  });

/**
 * An installation token for `REPO`, cached for the isolate's lifetime. Returns `null` for
 * any failure, which callers treat as "cannot check" rather than "denied".
 */
export async function installationToken(env: Env): Promise<string | null> {
  const { GITHUB_APP_ID: appId, GITHUB_APP_PRIVATE_KEY: privateKey, REPO: repo } = env;

  if (!appId || !privateKey || !repo) {
    return null;
  }

  if (cached && cached.expiresAt - TOKEN_MARGIN_MS > Date.now()) {
    return cached.token;
  }

  const jwt = await appJwt(appId, privateKey);

  if (!jwt) {
    return null;
  }

  const installation = await apiGet(`/repos/${repo}/installation`, jwt);

  if (!installation.ok) {
    return null;
  }

  const { id } = (await installation.json()) as { id?: number };
  const minted = id ? await apiGet(`/app/installations/${id}/access_tokens`, jwt, "POST") : null;

  if (!minted?.ok) {
    return null;
  }

  const { token, expires_at: expiresAt } = (await minted.json()) as {
    token?: string;
    expires_at?: string;
  };

  if (!token) {
    return null;
  }

  cached = { token, expiresAt: Date.parse(expiresAt ?? "") || Date.now() + 3_600_000 };

  return token;
}

/** `write`/`maintain`/`admin` on `REPO`, or `null` when the answer cannot be obtained. */
export async function fetchPermission(login: string, env: Env): Promise<string | null> {
  const token = await installationToken(env);

  if (!token) {
    return null;
  }

  const response = await apiGet(`/repos/${env.REPO}/collaborators/${login}/permission`, token);

  if (!response.ok) {
    return response.status === 404 ? "none" : null;
  }

  const { permission } = (await response.json()) as { permission?: string };

  return permission ?? null;
}
