import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // epubjs is dynamically imported in client code only, no server-side bundling needed
  turbopack: {},
};

export default nextConfig;
