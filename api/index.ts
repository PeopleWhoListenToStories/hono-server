import { handle } from "hono/vercel";

import app from "../src/index";

export const config = {
  runtime: "nodejs20.x", // ✅ 改成这样
};

export default handle(app);
