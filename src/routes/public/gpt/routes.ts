import { createRoute } from "@hono/zod-openapi";

import * as HttpStatusCodes from "@/lib/stoker/http-status-codes";

const routePrefix = "/gpt";
const tags = [`${routePrefix}（GPT模型）`];

// -------------------------------
// 1️⃣ 定义 OpenAPI 路由描述（不包含逻辑）
// -------------------------------
export const getGptChat = createRoute({
  tags,
  path: `${routePrefix}/chat`,
  method: "get",
  summary: "GPT 模型对话（流式输出）",
  description: "以 text/event-stream 方式返回 GPT 响应内容",
  responses: {
    [HttpStatusCodes.OK]: {
      description: "流式响应（text/event-stream）",
      content: {
        "text/event-stream": {
          schema: { type: "string" },
        },
      },
    },
  },
});
