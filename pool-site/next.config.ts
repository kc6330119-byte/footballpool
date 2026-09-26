import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['nodemailer'],
  outputFileTracingIncludes: {'/api/weekly-report': ['./public/newsletter/*.jpeg']},
};

export default nextConfig;
