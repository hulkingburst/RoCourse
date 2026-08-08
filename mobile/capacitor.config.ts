import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.hulkingburst.rocourse",
  appName: "RoCourse",
  webDir: "dist",
  server: {
    url: "https://ro-course.vercel.app",
    cleartext: false,
  },
};

export default config;
