import 'server-only';
import NextAuth, { type DefaultSession } from 'next-auth';
import Google from 'next-auth/providers/google';
import Kakao from 'next-auth/providers/kakao';
import { eq } from 'drizzle-orm';
import { db } from '@/server/db/client';
import { users } from '@/server/db/schema';

export type Role = 'user' | 'moderator' | 'admin';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      banned: boolean;
    } & DefaultSession['user'];
  }
}

// Emails listed in ADMIN_EMAILS (comma separated) become admins when they sign in with Google
const adminEmails = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Kakao({
      // Kakao login uses the app's REST API key as its client id
      clientId: process.env.AUTH_KAKAO_ID ?? process.env.KAKAO_REST_KEY,
      clientSecret: process.env.AUTH_KAKAO_SECRET,
    }),
    Google,
  ],
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  trustHost: true,
  callbacks: {
    // Runs on sign-in: create or update our own user row and remember its id in the token
    async jwt({ token, account, profile }) {
      if (account) {
        const email = (profile?.email ?? token.email ?? null)?.toLowerCase() ?? null;
        const values = {
          provider: account.provider,
          providerAccountId: account.providerAccountId,
          name: token.name ?? null,
          email,
          image: token.picture ?? null,
        };
        const [row] = await db
          .insert(users)
          .values(values)
          .onConflictDoUpdate({
            target: [users.provider, users.providerAccountId],
            set: { name: values.name, email: values.email, image: values.image },
          })
          .returning({ id: users.id, role: users.role });

        // Only trust the address when Google says it is verified. Otherwise anyone could type
        // an admin's email into another provider's profile and be promoted.
        const verifiedByGoogle = account.provider === 'google' && profile?.email_verified === true;
        if (verifiedByGoogle && email && adminEmails.includes(email) && row.role !== 'admin') {
          await db.update(users).set({ role: 'admin' }).where(eq(users.id, row.id));
        }
        token.uid = row.id;
      }
      return token;
    },
    // Runs whenever the session is read: load the current role and ban state from the database,
    // so a promotion or a ban takes effect without the user signing in again
    async session({ session, token }) {
      const uid = typeof token.uid === 'string' ? token.uid : null;
      if (!uid) return session;
      const [row] = await db
        .select({ id: users.id, role: users.role, bannedAt: users.bannedAt })
        .from(users)
        .where(eq(users.id, uid))
        .limit(1);
      if (!row) return session;
      session.user.id = row.id;
      session.user.role = row.role;
      session.user.banned = row.bannedAt !== null;
      return session;
    },
  },
});
