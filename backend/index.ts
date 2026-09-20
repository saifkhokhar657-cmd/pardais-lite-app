import { router, json, error } from '@appdeploy/sdk';

import {
  notifySubscribers,
  realtimeSubscriptionRoutes,
} from './realtime-subscribers';
import { pardaisRoutes } from './pardais';

export const handler = router({
  'GET /api/_healthcheck': [async () => json({ message: 'Success' })],

  ...realtimeSubscriptionRoutes,
  ...pardaisRoutes,
});
