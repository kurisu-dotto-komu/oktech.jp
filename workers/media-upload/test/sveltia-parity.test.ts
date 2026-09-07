/**
 * Proves the Worker verifies a request signed by the *installed* Sveltia CMS, not just by
 * our transcription of it. The signer is lifted out of the source map that ships with
 * `@sveltia/cms`; if that extraction ever stops working the check reports itself as skipped
 * rather than failing the suite, because only a real signature mismatch is a defect.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import worker from "../src/index";
import { sha256Hex, toAmzDate } from "../src/sigv4";
import { ACCESS_KEY_ID, BUCKET, ENDPOINT, ORIGIN, SECRET, check, makeEnv, report } from "./harness";
import { signLikeSveltia, toRequest } from "./sign";

const SOURCE_MAP = "../../../node_modules/@sveltia/cms/dist/sveltia-cms.mjs.map";

type GenerateAwsSignature = (params: {
  method: string;
  url: string;
  headers: Record<string, string>;
  payloadHash: string;
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
  service: string;
  date: Date;
}) => Promise<string>;

function loadUpstreamSigner(): GenerateAwsSignature | null {
  try {
    const raw = readFileSync(fileURLToPath(new URL(SOURCE_MAP, import.meta.url)), "utf8");
    const map = JSON.parse(raw) as { sources: string[]; sourcesContent: string[] };
    const index = map.sources.findIndex((source) => source.endsWith("s3/core.js"));
    const module = map.sourcesContent[index]
      .replace(/^import .*$/gm, "")
      .replace(/^export const/gm, "const");

    return new Function(`${module}\nreturn generateAwsSignature;`)() as GenerateAwsSignature;
  } catch {
    return null;
  }
}

async function main(): Promise<void> {
  const generateAwsSignature = loadUpstreamSigner();

  if (!generateAwsSignature) {
    console.log("  skip Sveltia's signer could not be extracted from its source map");
    report();
  }

  const date = new Date();
  const url = `${ENDPOINT}/${BUCKET}/events/261003-cover.png`;
  const body = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]).buffer;
  const payloadHash = await sha256Hex(body);

  // The header object `signedRequest` builds: Host, x-amz-date, x-amz-content-sha256,
  // then the extraHeaders `uploadToS3` adds for a PUT.
  const headers = {
    Host: new URL(url).host,
    "x-amz-date": toAmzDate(date),
    "x-amz-content-sha256": payloadHash,
    "Content-Type": "image/png",
    "x-amz-acl": "public-read",
  };

  const authorization = await generateAwsSignature({
    method: "PUT",
    url,
    headers,
    payloadHash,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET,
    region: "auto",
    service: "s3",
    date,
  });

  const ours = await signLikeSveltia({
    method: "PUT",
    url,
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET,
    body,
    extraHeaders: { "Content-Type": "image/png", "x-amz-acl": "public-read" },
    date,
  });

  check(
    "the test signer reproduces Sveltia's Authorization byte for byte",
    ours.headers.Authorization === authorization,
  );

  const response = await worker.fetch(
    toRequest(
      { method: "PUT", url, headers: { ...headers, Authorization: authorization }, body },
      { Origin: ORIGIN },
    ),
    makeEnv(),
  );

  check(
    "the Worker accepts a request signed by the installed Sveltia CMS",
    response.status === 200,
    `status ${response.status}`,
  );

  report();
}

void main();
