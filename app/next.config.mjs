/** Static pages from committed synthetic data; one optional API route (/api/classify). */
const nextConfig = {
  outputFileTracingRoot: import.meta.dirname,
  trailingSlash: true, poweredByHeader: false,
  async headers() { return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]; },
};
export default nextConfig;
