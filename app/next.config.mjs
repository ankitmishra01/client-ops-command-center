/** Static pages from committed synthetic data; one optional API route (/api/classify). */
const nextConfig = {
  trailingSlash: true, poweredByHeader: false,
  async headers() { return [{ source: "/:path*", headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }] }]; },
};
export default nextConfig;
