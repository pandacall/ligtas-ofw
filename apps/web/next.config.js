/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Default Server Action body limit is 1MB — too small for a screenshot upload (the
    // multipart POST carries the raw file bytes; apps/web/lib/image-upload.ts's
    // MAX_IMAGE_BYTES caps that at 4MiB). 6mb leaves headroom for multipart overhead. If
    // this app deploys to Vercel, Vercel Functions may also enforce their own
    // platform-level request-body ceiling on top of this — verify at deploy time.
    serverActions: {
      bodySizeLimit: "6mb",
    },
  },
};

module.exports = nextConfig;
