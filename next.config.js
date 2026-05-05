/** @type {import('next').NextConfig} */
const isGitHubPages = process.env.GITHUB_PAGES === 'true';

const nextConfig = {
  ...(isGitHubPages && {
    output: 'export',
    basePath: '/Uitdager',
    trailingSlash: true,
  }),
  images: { unoptimized: true },
};

module.exports = nextConfig;
