import { handle } from "@hono/node-server/vercel";

import app from "../src/index.vercel";

export const config = {
  runtime: "nodejs", // ✅ 必须声明
};

export default handle(app);
