import { withAuth } from "next-auth/middleware";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token,
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/transactions/:path*",
    "/insights/:path*",
    "/goals/:path*",
    "/security/:path*",
    "/accounts/:path*",
    "/budget/:path*",
  ],
};
