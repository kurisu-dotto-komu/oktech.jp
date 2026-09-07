/** Signature verification: what the Worker accepts as proof that a maintainer sent this. */
import worker from "../src/index";
import {
  ACCESS_KEY_ID,
  BUCKET,
  ENDPOINT,
  ORIGIN,
  SECRET,
  check,
  makeEnv,
  report,
  send,
  signedPut,
} from "./harness";
import { toRequest } from "./sign";

async function main(): Promise<void> {
  check("test secret matches Sveltia's aws_s3 apiKeyPattern", /^[A-Za-z0-9/+=]{40}$/.test(SECRET));

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

  check("an unknown secret is rejected", (await send(wrongSecret, env)).status === 403);

  const revoked = await signedPut("events/other.png", { accessKeyId: "revoked" });

  check("a revoked access key id is rejected", (await send(revoked, env)).status === 403);

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

  const emptyWhitelist = await send(await signedPut("events/a.png"), makeEnv({ MAINTAINERS: "" }));

  check("an empty whitelist rejects everyone", emptyWhitelist.status === 403);

  const otherBucket = await send(
    await signedPut("events/a.png"),
    makeEnv({ BUCKET_NAME: "somewhere-else" }),
  );

  check("a request for another bucket is refused", otherBucket.status === 404);

  const shared = makeEnv({
    MAINTAINERS: JSON.stringify([
      { name: "one", accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET.replace(/.$/, "0") },
      { name: "two", accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET },
    ]),
  });

  check(
    "maintainers sharing one access key id are told apart by secret",
    (await send(await signedPut("events/shared.png"), shared)).status === 200,
  );

  report();
}

void main();
