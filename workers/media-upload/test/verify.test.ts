/** Signature verification: what the Worker accepts as proof that the auth Worker minted this. */
import { deriveCredential, deriveSecretAccessKey } from "../../shared/credentials";
import worker from "../src/index";
import {
  BUCKET,
  ENDPOINT,
  LOGIN,
  ORIGIN,
  SECRET,
  SERVER_SECRET,
  check,
  makeEnv,
  report,
  send,
  signedPut,
} from "./harness";
import { toRequest } from "./sign";

async function main(): Promise<void> {
  check(
    "the derived secret matches Sveltia's aws_s3 apiKeyPattern",
    /^[A-Za-z0-9/+=]{40}$/.test(SECRET),
    SECRET.length === 40 ? "" : `length ${SECRET.length}`,
  );

  const env = makeEnv();
  const signed = await signedPut("events/260919-cover.png");
  const accepted = await send(signed, env);

  check(
    "a Sveltia-signed PutObject is accepted",
    accepted.status === 200,
    `status ${accepted.status}`,
  );
  check(
    "the object reaches R2 under the signed key",
    env.MEDIA.objects.has("events/260919-cover.png"),
  );
  check(
    "the response is CORS-visible to the CMS origin",
    accepted.headers.get("Access-Control-Allow-Origin") === ORIGIN,
  );

  const tampered = signed.headers.Authorization.replace(/.$/, (c) => (c === "a" ? "b" : "a"));

  check(
    "a tampered signature is rejected",
    (await send(signed, env, { Authorization: tampered })).status === 403,
  );

  const wrongSecret = await signedPut("events/other.png", {
    secretAccessKey: SECRET.replace(/.$/, "0"),
  });

  check("a guessed secret is rejected", (await send(wrongSecret, env)).status === 403);

  const malformed = await signedPut("events/other.png", { accessKeyId: "no-expiry-here" });

  check(
    "an access key id without an expiry is rejected",
    (await send(malformed, env)).status === 403,
  );

  // Someone who knows another editor's login still cannot forge their secret
  const impostor = await deriveCredential("a-different-server-secret", LOGIN);
  const forged = await signedPut("events/forged.png", {
    accessKeyId: impostor.accessKeyId,
    secretAccessKey: impostor.secretAccessKey,
  });

  check(
    "a credential from another server secret is rejected",
    (await send(forged, env)).status === 403,
  );

  const expiredId = `${LOGIN}.20200101`;
  const expired = await signedPut("events/expired.png", {
    accessKeyId: expiredId,
    secretAccessKey: await deriveSecretAccessKey(SERVER_SECRET, expiredId),
  });
  const expiredResponse = await send(expired, env);

  check(
    "a correctly signed but expired credential is rejected",
    expiredResponse.status === 403,
    `status ${expiredResponse.status}`,
  );
  check("the expiry rejection says so", (await expiredResponse.text()).includes("expired"));

  const denied = await send(
    await signedPut("events/denied.png"),
    makeEnv({ DENYLIST: `someone, ${LOGIN}` }),
  );

  check("a denylisted login is rejected", denied.status === 403, `status ${denied.status}`);
  check(
    "the denylist is case-insensitive",
    (await send(await signedPut("events/denied2.png"), makeEnv({ DENYLIST: LOGIN.toUpperCase() })))
      .status === 403,
  );

  const swappedBody = new Request(toRequest(signed, { Origin: ORIGIN }), {
    method: "PUT",
    body: new Uint8Array([1, 2, 3]).buffer,
  });

  check(
    "a body swapped after signing is rejected",
    (await worker.fetch(swappedBody, env)).status === 400,
  );

  const stale = await signedPut("events/stale.png", {
    date: new Date(Date.now() - 20 * 60 * 1000),
  });

  check("a stale x-amz-date is rejected", (await send(stale, env)).status === 403);

  const unsigned = await worker.fetch(
    new Request(`${ENDPOINT}/${BUCKET}/events/x.png`, { method: "PUT" }),
    env,
  );

  check("an unsigned request is rejected", unsigned.status === 401, `status ${unsigned.status}`);

  const noServerSecret = await send(
    await signedPut("events/a.png"),
    makeEnv({ SERVER_SECRET: "" }),
  );

  check("an unconfigured SERVER_SECRET rejects everyone", noServerSecret.status === 403);

  const otherBucket = await send(
    await signedPut("events/a.png"),
    makeEnv({ BUCKET_NAME: "somewhere-else" }),
  );

  check("a request for another bucket is refused", otherBucket.status === 404);

  report();
}

void main();
