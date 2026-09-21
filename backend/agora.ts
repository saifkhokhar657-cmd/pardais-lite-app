import { RtcRole, RtcTokenBuilder } from 'agora-token';

const appId = () => process.env.AGORA_APP_ID?.trim() || '';
const certificate = () => process.env.AGORA_APP_CERTIFICATE?.trim() || '';
const ttl = () => Math.max(300, Number(process.env.AGORA_TOKEN_TTL_SECONDS || 3600));

export function numericAgoraUid(uid: string) {
  let h = 2166136261;
  for (let i = 0; i < uid.length; i++) {
    h ^= uid.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  const n = (h >>> 0) % 4294967294;
  return n === 0 ? 1 : n;
}

export function buildRtcToken(channel: string, uid: string, role: 'host' | 'audience') {
  const id = appId();
  const certValue = certificate();
  if (!id || !certValue) throw new Error('Agora production credentials are not configured');
  const agoraUid = numericAgoraUid(uid);
  const expires = Math.floor(Date.now() / 1000) + ttl();
  const rtcRole = role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  const token = RtcTokenBuilder.buildTokenWithUid(id, certValue, channel, agoraUid, rtcRole, expires);
  return { token, appId: id, uid: agoraUid, expiresAt: expires };
}
