import session from "express-session";
import { q } from "./db.js";

export class DbSessionStore extends session.Store {
  async get(sid: string, cb: (err?: any, session?: session.SessionData | null) => void) {
    try {
      const result = await q<{ sess: session.SessionData }>("SELECT sess FROM user_sessions WHERE sid=$1 AND expire > now()", [sid]);
      cb(null, result.rows[0]?.sess || null);
    } catch (err) {
      cb(err);
    }
  }

  async set(sid: string, sess: session.SessionData, cb?: (err?: any) => void) {
    try {
      const expire = sess.cookie?.expires ? new Date(sess.cookie.expires) : new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
      await q(
        `INSERT INTO user_sessions(sid,sess,expire) VALUES($1,$2,$3)
         ON CONFLICT(sid) DO UPDATE SET sess=excluded.sess, expire=excluded.expire`,
        [sid, sess, expire]
      );
      cb?.();
    } catch (err) {
      cb?.(err);
    }
  }

  async destroy(sid: string, cb?: (err?: any) => void) {
    try {
      await q("DELETE FROM user_sessions WHERE sid=$1", [sid]);
      cb?.();
    } catch (err) {
      cb?.(err);
    }
  }
}

