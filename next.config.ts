import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 自分用（npm run dev:mine）は作業フォルダを分けて、見本と同時に起動してもぶつからないようにする
  distDir: process.env.NEXT_PUBLIC_DATA_MODE === "mine" ? ".next-mine" : ".next",
};

export default nextConfig;
