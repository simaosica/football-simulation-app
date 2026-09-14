import NextAuth from "next-auth/middleware";

export const proxy = NextAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: ["/start/:path*"],
};