import * as z from "zod";

import app from "./app";

// 配置 Zod 使用中文错误消息
z.config(z.locales.zhCN());

export default app;
