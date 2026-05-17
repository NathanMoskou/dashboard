import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Next.js 15+ flag — enables browser View Transitions API for client-side
    // navigations (cross-fade between routes). Falls back gracefully on
    // browsers without document.startViewTransition.
    viewTransition: true,
  },
};

export default nextConfig;
