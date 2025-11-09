import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";

import { db } from "~/server/db";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export const authConfig = {
  providers: [
    // Add your authentication providers here
    // Example: GoogleProvider, GitHubProvider, etc.
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user?.email || !user?.password) {
          return null;
        }

        const plain = credentials.password as string;
        const hashed = user.password;

        try {
          const isValid: boolean = await compare(plain, hashed);

          if (!isValid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
          };
        } catch (err) {
          console.error("Erro ao comparar senhas:", err);
          return null;
        }
      },
    }),
  ],
  adapter: PrismaAdapter(db),
  session: {
    strategy: "jwt",
  },
  callbacks: {
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub ?? "",
      },
    }),
    jwt: ({ token, user }) => {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },
    redirect: async ({ url, baseUrl }) => {
      // If there is a callback URL, use that; otherwise, use baseUrl.
      if (url.startsWith(baseUrl)) {
        return url;
      }
      return baseUrl;
    },
  },
  pages: {
    signIn: "/auth/login", // Custom login page
  },
} satisfies NextAuthConfig;
