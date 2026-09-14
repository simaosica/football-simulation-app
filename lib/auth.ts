import NextAuth, { type NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

export const authOptions: NextAuthOptions = {
  debug: process.env.NODE_ENV === "development",

  adapter: PrismaAdapter(prisma),

  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
    }),       

    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        if (!credentials?.email || !credentials.password){
          throw new Error("MISSING_CREDENTIALS");
        }

        const email = credentials.email.trim().toLowerCase();

        const user = await prisma.user.findUnique({where: { email }});

        if (!user){
          throw new Error("USER_NOT_FOUND");
        }

        if (!user.password){
          throw new Error("OAUTH_ACCOUNT");
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid){
          throw new Error("INVALID_PASSWORD");
        }

        if (!user.emailVerified) {
          throw new Error("EMAIL_NOT_VERIFIED");
        }        

        console.log("AUTHORIZE: returning user =", {
          id: user.id,
          email: user.email,
          typeofId: typeof user.id,
        });        

        // Login successful
        return {
          id: user.id,
          email: user.email,
          name: user.name,
        };        
      },
    }),
  ],

  pages: {
    signIn: "/"
  },

  session: {
    strategy: "jwt"
  },

  callbacks: {  
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
  
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  
  events: {
    async createUser({ user }) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: new Date(),
        },
      });
    },
  },  
};

export default NextAuth(authOptions);