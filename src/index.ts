import { handle } from "@hono/node-server/vercel";
import * as z from "zod";

import app from "./app";
import env from "./env";
import { logServerStart, setupGracefulShutdown, setupJobSystem, startServerWithRetry } from "./lib/server";

/**
 * ✅ Vercel 配置：必须导出 config
 * 指定运行时环境（Node.js，而不是 Edge）
 */
export const config = {
  runtime: "nodejs",
};

// 配置 Zod 使用中文错误消息
z.config(z.locales.zhCN());

// 初始化并启动任务系统
await setupJobSystem();

// 启动 HTTP 服务器（带端口占用重试）
const server = await startServerWithRetry(app, env.PORT);

// 打印启动成功消息
await logServerStart();

// 设置优雅关闭
setupGracefulShutdown(server);

/**
 * ✅ Vercel Serverless 入口
 */
export default handle(app);
