import type { Request, Response, NextFunction } from 'express';
import { adminAuth } from './firebase-admin.js';

export interface AuthenticatedRequest extends Request {
  user?: { uid: string; email?: string; name?: string; picture?: string; [key: string]: unknown };
}

export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const header = req.header('authorization') || '';
    if (!header.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' });
    const decoded = await adminAuth.verifyIdToken(header.slice(7));
    req.user = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired authentication token' });
  }
}

export function assertSelf(req: AuthenticatedRequest, requestedId: string) {
  if (!req.user || req.user.uid !== requestedId) {
    const error = new Error('You can only modify your own account');
    (error as any).status = 403;
    throw error;
  }
}
