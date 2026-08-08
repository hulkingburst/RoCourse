import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      handle?: string | null;
    } & DefaultSession["user"];
  }

  interface User {
    handle?: string | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    handle?: string | null;
  }
}
