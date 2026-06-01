import { NextAuthOptions } from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { verifySync } from "otplib";
import { prisma } from "./db";

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as NextAuthOptions["adapter"],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        otp: { label: "OTP", type: "text" },
        backupCode: { label: "Backup Code", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user || !user.password) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) return null;

        if (user.twoFactorEnabled) {
          if (credentials.backupCode) {
            // Verify backup code (one-time use)
            const code = credentials.backupCode.trim().toUpperCase();
            let matchedIndex = -1;
            for (let i = 0; i < user.backupCodes.length; i++) {
              if (await bcrypt.compare(code, user.backupCodes[i])) {
                matchedIndex = i;
                break;
              }
            }
            if (matchedIndex === -1) return null;

            // Consume the used code
            const remaining = user.backupCodes.filter((_, i) => i !== matchedIndex);
            await prisma.user.update({
              where: { id: user.id },
              data: { backupCodes: remaining },
            });
          } else {
            // Verify TOTP
            if (!credentials.otp || !user.twoFactorSecret) return null;
            const { valid: otpValid } = verifySync({
              token: credentials.otp,
              secret: user.twoFactorSecret,
            });
            if (!otpValid) return null;
          }
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
};
