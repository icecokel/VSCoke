import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// 토큰 갱신 함수
async function refreshAccessToken(refreshToken: string) {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AUTH_GOOGLE_ID!,
        client_secret: process.env.AUTH_GOOGLE_SECRET!,
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    });

    const tokens = await response.json();

    if (!response.ok) {
      throw new Error(tokens.error || "Failed to refresh token");
    }

    return {
      accessToken: tokens.access_token,
      idToken: tokens.id_token,
      expiresAt: Math.floor(Date.now() / 1000) + tokens.expires_in,
      refreshToken: tokens.refresh_token ?? refreshToken,
    };
  } catch {
    return { error: "RefreshAccessTokenError" };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      // 최초 로그인 시 토큰 저장
      if (account) {
        return {
          ...token,
          accessToken: account.access_token,
          idToken: account.id_token,
          refreshToken: account.refresh_token,
          expiresAt: account.expires_at,
        };
      }

      // 토큰이 아직 유효한 경우
      if (Date.now() < (token.expiresAt as number) * 1000) {
        return token;
      }

      // 토큰 만료 - 갱신 시도
      const refreshed = await refreshAccessToken(token.refreshToken as string);

      if ("error" in refreshed) {
        return { ...token, error: refreshed.error };
      }

      return {
        ...token,
        accessToken: refreshed.accessToken,
        idToken: refreshed.idToken,
        expiresAt: refreshed.expiresAt,
        refreshToken: refreshed.refreshToken,
      };
    },
    async session({ session, token }) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).idToken = token.idToken;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (session as any).error = token.error;
      return session;
    },
  },
});
