/**
 * `/media-credentials` end to end against a stubbed GitHub, plus the property the whole
 * design rests on: what this Worker mints is exactly what the upload Worker re-derives.
 */
import { deriveSecretAccessKey, parseAccessKeyId } from "../../shared/credentials";
import worker from "../src/index";
import type { Env, MediaCredentialsBody } from "../src/types";

const ORIGIN = "https://cms.example.test";
const SERVER_SECRET = "test-server-secret-not-a-real-one";
const REPO = "example/site";

const env: Env = {
  ALLOWED_DOMAINS: "cms.example.test, *.preview.example.test",
  SERVER_SECRET,
  REPO,
  MEDIA_ENDPOINT: "https://uploads.example.test",
  MEDIA_BUCKET: "example-media",
};

/** Stubs the two GitHub calls the handler makes; `push` of `null` means the repo read 403s. */
function stubGitHub(users: Record<string, { login: string; push: boolean | null }>): void {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input instanceof Request ? input.url : input);
    const auth = String(
      (input instanceof Request ? input.headers : new Headers(init?.headers)).get("Authorization"),
    );
    const account = users[auth.replace(/^Bearer\s+/i, "")];

    if (!account) {
      return new Response("{}", { status: 401 });
    }

    if (url.endsWith("/user")) {
      return Response.json({ login: account.login });
    }

    if (url.endsWith(`/repos/${REPO}`)) {
      return account.push === null
        ? new Response("{}", { status: 403 })
        : Response.json({ permissions: { admin: false, maintain: false, push: account.push } });
    }

    return new Response("{}", { status: 404 });
  }) as typeof fetch;
}

const call = (token: string | null, origin = ORIGIN, overrides: Partial<Env> = {}) =>
  worker.fetch(
    new Request("https://auth.example.test/media-credentials", {
      headers: { Origin: origin, ...(token && { Authorization: `Bearer ${token}` }) },
    }),
    { ...env, ...overrides },
  );

let failures = 0;
let checks = 0;

function check(label: string, condition: boolean, detail = ""): void {
  checks += 1;
  if (condition) {
    console.log(`  ok   ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

async function main(): Promise<void> {
  stubGitHub({
    "writer-token": { login: "writer", push: true },
    "reader-token": { login: "reader", push: false },
    "outsider-token": { login: "outsider", push: null },
    "guest-token": { login: "guest", push: false },
  });

  const response = await call("writer-token");
  const body = (await response.json()) as MediaCredentialsBody;

  check("a writer gets a credential", response.status === 200, `status ${response.status}`);
  check(
    "the response is CORS-visible",
    response.headers.get("Access-Control-Allow-Origin") === ORIGIN,
  );
  check("the access key id carries the login", body.accessKeyId.startsWith("writer."));
  check(
    "the secret matches Sveltia's aws_s3 apiKeyPattern",
    /^[A-Za-z0-9/+=]{40}$/.test(body.secretAccessKey),
  );
  check(
    "the endpoint and bucket are echoed",
    body.endpoint === env.MEDIA_ENDPOINT && body.bucket === env.MEDIA_BUCKET,
  );

  const parsed = parseAccessKeyId(body.accessKeyId);

  check("the access key id parses back", !!parsed && parsed.login === "writer");
  check(
    "the expiry is 30 days out and matches the body",
    !!parsed && parsed.expiresAt.toISOString() === body.expiresAt,
  );
  check(
    "the upload Worker re-derives the same secret",
    (await deriveSecretAccessKey(SERVER_SECRET, body.accessKeyId)) === body.secretAccessKey,
  );

  check("a reader is refused", (await call("reader-token")).status === 403);
  check(
    "a repository the token cannot read is refused",
    (await call("outsider-token")).status === 403,
  );
  check("an unknown token is refused", (await call("nope")).status === 401);
  check("a missing token is refused", (await call(null)).status === 401);
  check(
    "ALLOWED_LOGINS overrides the permission check",
    (await call("guest-token", ORIGIN, { ALLOWED_LOGINS: "someone, guest" })).status === 200,
  );
  check(
    "an unconfigured Worker says so rather than minting",
    (await call("writer-token", ORIGIN, { SERVER_SECRET: undefined })).status === 503,
  );
  check(
    "a foreign origin gets no CORS header",
    (await call("writer-token", "https://evil.example")).headers.get(
      "Access-Control-Allow-Origin",
    ) === null,
  );
  check(
    "a wildcard preview origin does",
    (await call("writer-token", "https://pr-9.preview.example.test")).headers.get(
      "Access-Control-Allow-Origin",
    ) === "https://pr-9.preview.example.test",
  );

  const preflight = await worker.fetch(
    new Request("https://auth.example.test/media-credentials", {
      method: "OPTIONS",
      headers: { Origin: ORIGIN, "Access-Control-Request-Method": "GET" },
    }),
    env,
  );

  check("preflight is answered", preflight.status === 204);

  const notOurs = await worker.fetch(new Request("https://auth.example.test/nope"), env);

  check("other paths fall through to the vendored handler", notOurs.status === 404);

  console.log(`\n${checks - failures}/${checks} checks passed`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
