/** Everything the Worker enforces after the signature checks out. */
import worker from "../src/index";
import { checkKey } from "../src/policy";
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
import { signLikeSveltia } from "./sign";

const preflight = (origin: string) =>
  worker.fetch(
    new Request(`${ENDPOINT}/${BUCKET}/events/x.png`, {
      method: "OPTIONS",
      headers: { Origin: origin, "Access-Control-Request-Method": "PUT" },
    }),
    makeEnv(),
  );

async function main(): Promise<void> {
  const env = makeEnv();

  await send(await signedPut("events/260919-cover.png"), env);

  check(
    "re-uploading an existing key is refused",
    (await send(await signedPut("events/260919-cover.png"), env)).status === 409,
  );

  const overwriteEnv = makeEnv({
    MAINTAINERS: JSON.stringify([
      { name: "editor", accessKeyId: ACCESS_KEY_ID, secretAccessKey: SECRET, overwrite: true },
    ]),
  });

  await send(await signedPut("events/dup.png"), overwriteEnv);

  check(
    "overwrite:true lets a maintainer replace a key",
    (await send(await signedPut("events/dup.png"), overwriteEnv)).status === 200,
  );

  check(
    "a key outside the maintainer's prefixes is refused",
    (await send(await signedPut("articles/x.png"), env)).status === 403,
  );

  // The URL parser collapses `..` segments (including their percent-encoded spellings), so
  // a traversal never reaches the key; `checkKey` is the belt to that braces.
  check(
    "a traversal in the request path cannot address another bucket",
    (await send(await signedPut("events/../../x.png"), env)).status === 404,
  );
  check(
    "checkKey rejects a dot-dot segment outright",
    !checkKey("events/../x.png", { name: "e", accessKeyId: "a", secretAccessKey: "b" }, env).ok,
  );

  check(
    "a non-image content type is refused",
    (
      await send(
        await signedPut("events/x.pdf", { extraHeaders: { "Content-Type": "application/pdf" } }),
        env,
      )
    ).status === 415,
  );

  check(
    "an extension that contradicts the content type is refused",
    (await send(await signedPut("events/x.jpg"), env)).status === 400,
  );

  check(
    "an oversized upload is refused",
    (await send(await signedPut("events/big.png"), makeEnv({ MAX_UPLOAD_BYTES: "4" }))).status ===
      413,
  );

  const listed = await send(
    await signLikeSveltia({
      method: "GET",
      url: `${ENDPOINT}/${BUCKET}?list-type=2&max-keys=1000&prefix=events%2F`,
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET,
    }),
    env,
  );
  const xml = await listed.text();

  check("ListObjectsV2 answers with XML", listed.status === 200 && xml.startsWith("<?xml"));
  check(
    "the listing contains the uploaded key",
    xml.includes("<Key>events/260919-cover.png</Key>"),
  );
  check("the listing reports a complete page", xml.includes("<IsTruncated>false</IsTruncated>"));

  check("the CMS origin passes preflight", (await preflight(ORIGIN)).status === 204);
  check(
    "an unlisted origin fails preflight",
    (await preflight("https://evil.example")).status === 403,
  );

  report();
}

void main();
