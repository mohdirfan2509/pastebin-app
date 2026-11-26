import { config } from "dotenv";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.test"), override: true });

process.env.TEST_MODE = process.env.TEST_MODE || "true";
process.env.APP_URL = process.env.APP_URL || "http://localhost:3000";
process.env.NEXT_PUBLIC_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
