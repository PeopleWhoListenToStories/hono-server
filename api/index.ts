import { handle } from "@hono/node-server/vercel";

import app from "../src/index";

export const config = {
  runtime: "nodejs", // ✅ 必须声明
};

export default handle(app);
