/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 如果在Electron环境中运行时需要特殊配置
  assetPrefix: process.env.NODE_ENV === 'production' ? './' : undefined,
  images: {
    unoptimized: process.env.NODE_ENV === 'production',
  },
  // 禁用默认的Next.js服务器优化
  experimental: {
    appDir: false,
  },
}

module.exports = nextConfig
