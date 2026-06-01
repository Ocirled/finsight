export { default } from "next-auth/middleware";

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
