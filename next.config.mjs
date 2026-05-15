/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
  transpilePackages: [
    "three",
    "@react-three/fiber",
    "@react-three/drei",
    "three-mesh-bvh",
    "three-bvh-csg",
  ],
  webpack: (config) => {
    // Web Worker'lar `new Worker(new URL('...', import.meta.url))` deseniyle
    // çalışır; Next 14 webpack bunu yerel olarak destekler, ek loader gerekmez.
    config.resolve.fallback = { ...config.resolve.fallback, fs: false };
    return config;
  },
};

export default nextConfig;
