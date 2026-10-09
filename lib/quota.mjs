import { SafeError } from './jev.mjs';
export const LIMITS={requestsPerMinute:10,requestsPerDay:100,questionsPerDay:500};
// One conditional UPSERT changes all counters atomically. Stable one row per Site.
// Site-global quotas also prevent quota multiplication by changing an identity.
export async function reserveQuota(db,count,now=Date.now()) {
 if(!db)throw new SafeError('QUOTA_UNAVAILABLE','Usage limits are unavailable; no Jev request was sent.',503);
 const minute=Math.floor(now/60000),day=Math.floor(now/86400000);
 try {
  const row=await db.prepare(`INSERT INTO quota (key,minute,day,minute_requests,day_requests,day_questions) VALUES ('site',?,?,1,1,?)
ON CONFLICT(key) DO UPDATE SET minute=excluded.minute,day=excluded.day,
minute_requests=CASE WHEN quota.minute=excluded.minute THEN quota.minute_requests+1 ELSE 1 END,
day_requests=CASE WHEN quota.day=excluded.day THEN quota.day_requests+1 ELSE 1 END,
day_questions=CASE WHEN quota.day=excluded.day THEN quota.day_questions+excluded.day_questions ELSE excluded.day_questions END
WHERE quota.minute<=excluded.minute AND quota.day<=excluded.day
AND (quota.minute<>excluded.minute OR quota.minute_requests<10)
AND (quota.day<>excluded.day OR (quota.day_requests<100 AND quota.day_questions+excluded.day_questions<=500))
RETURNING minute_requests,day_requests,day_questions`).bind(minute,day,count).first();
  if(!row)throw new SafeError('LOCAL_RATE_LIMIT','This private deployment has reached its request or question limit.',429);
  return row;
 } catch(e){if(e instanceof SafeError)throw e;throw new SafeError('QUOTA_UNAVAILABLE','Usage limits are unavailable; no Jev request was sent.',503);}
}
