/** Just enough of the R2 API for a read-only GET, in the style of the other Workers here. */
export interface R2Object {
  body: ReadableStream | null;
  httpEtag: string;
  size: number;
  writeHttpMetadata(headers: Headers): void;
}

export interface R2Bucket {
  get(key: string): Promise<R2Object | null>;
}

export interface Env {
  /** Read-only binding to the media bucket. */
  MEDIA: R2Bucket;
  /** The static site in `dist`, so anything that is not an upload is served as before. */
  ASSETS: { fetch(request: Request): Promise<Response> };
}
