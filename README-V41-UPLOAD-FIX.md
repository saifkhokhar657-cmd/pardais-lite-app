# V41 — Production video upload fix

- Video posting now requests an authenticated R2 presigned PUT URL first.
- The large video file is uploaded directly to Cloudflare R2 instead of being pushed through the Railway API request body.
- Existing Railway `/api/media/upload` remains as a fallback for deployments where browser-side R2 CORS has not yet been configured.
- Reel metadata is created only after the media upload succeeds.
- Generic browser `Failed to fetch` is converted to a clearer upload/network message.
- Existing UI/live/reel functionality is unchanged.

For direct R2 browser uploads, the R2 bucket CORS policy must allow the production web origins for `PUT` and the `Content-Type` request header. The fallback keeps uploads working while that is being configured.
