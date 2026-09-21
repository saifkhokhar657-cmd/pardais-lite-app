import { DeleteObjectCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function client() {
  const endpoint = process.env.R2_ENDPOINT;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!endpoint || !accessKeyId || !secretAccessKey) throw new Error('R2 production credentials are not configured');
  return new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } });
}

export async function createUploadUrl(key: string, contentType: string) {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error('R2_BUCKET_NAME is not configured');
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType });
  const expiresIn = Math.max(60, Number(process.env.R2_PRESIGNED_TTL_SECONDS || 900));
  const url = await getSignedUrl(client(), command, { expiresIn });
  return { url, key, publicUrl: `${(process.env.R2_PUBLIC_BASE_URL || '').replace(/\/$/, '')}/${key}` };
}

export async function createDownloadUrl(key: string) {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error('R2_BUCKET_NAME is not configured');
  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  const expiresIn = Math.max(60, Number(process.env.R2_PRESIGNED_TTL_SECONDS || 900));
  return getSignedUrl(client(), command, { expiresIn });
}

export async function deleteObject(key: string) { const bucket = process.env.R2_BUCKET_NAME; if (!bucket) throw new Error('R2_BUCKET_NAME is not configured'); await client().send(new DeleteObjectCommand({ Bucket: bucket, Key: key })); }
