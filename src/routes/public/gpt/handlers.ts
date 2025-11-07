import { encode } from "gpt-tokenizer";
import OpenAI from "openai";
import pkg from "pg";

import env from "@/env";
import { decryptCollabToken } from "@/utils/tools/crypto";

import type { GptRouteHandlerType } from ".";

const { Pool } = pkg;

// 创建连接池
export const pool = new Pool({
  connectionString: env.DATABASE_URL_CLIENT,
});

/**
 * ✅ 初始化 OpenAI 客户端（兼容 DashScope/DeepSeek API）
 */
const client = new OpenAI({
  apiKey: env.OPENAI_BASE_URL,
  baseURL: env.OPENAI_API_KEY,
  timeout: 1000 * 60 * 5,
});

export const getGptChat = (async (c) => {
  // 1️⃣ 校验 token 是否存在
  console.log(`%c 👨‍👨‍👧‍👧 🚀 : getGptChat -> c.req.query("option") `, `font-size:14px;background-color:#08da13;color:black;`, c.req.query("option"));

  console.log(`%c 👨‍🌾 🚀 : getGptChat -> c.req.query("x-auth-token") `, `font-size:14px;background-color:#f2c469;color:black;`, c.req.query("x-auth-token"));
  const token = c.req.query("x-auth-token");
  if (!token)
    return c.json({ error: "Missing auth token" }, 401);

  // 2️⃣ 解密 token
  let decryptedData;
  try {
    decryptedData = decryptCollabToken(token);
  }
  catch (error) {
    console.error("error", error);
    return c.json({ error: "Invalid or expired token" }, 401);
  }

  const { dt, userId } = decryptedData;
  const prompt = c.req.query("option");
  if (!prompt)
    return c.json({ error: "Missing prompt field" }, 400);

  const tokenExpiredInMilliseconds = 1000 * (Number(env.TOKEN_EXPIRED_IN_SECONDS || 60 * 1));
  // 3️⃣ 校验 token 时效性
  if (Date.now() - dt > tokenExpiredInMilliseconds) {
    return c.json(
      { error: "Token expired", tokenAge: Date.now() - dt },
      400,
    );
  }

  // 4️⃣ 调用 OpenAI 模型生成内容（流式）
  try {
    const stream = await client.chat.completions.create({
      model: env.CHAT_MODEL!,
      messages: [{ role: "user", content: prompt }],
      stream: true,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const promptTokens = encode(prompt).length;
        let outputBuffer = "";

        try {
          for await (const chunk of stream) {
            const content = chunk.choices?.[0]?.delta?.content;
            if (content) {
              outputBuffer += content;
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ c: content })}\n\n`,
                ),
              );
            }
          }

          // ✅ token 用量统计
          const completionTokens = encode(outputBuffer).length;
          const totalTokens = promptTokens + completionTokens;
          const usageInfo = {
            prompt_tokens: promptTokens,
            completion_tokens: completionTokens,
            total_tokens: totalTokens,
          };

          // ✅ 查询 & 更新用户 token 用量
          const { rows } = await pool.query(
            "SELECT * FROM \"TokenUsage\" WHERE \"userId\" = $1",
            [userId],
          );
          const userTokenUsage = rows[0];
          if (!userTokenUsage) {
            controller.enqueue(
              encoder.encode("data: [ERROR] User not found\n\n"),
            );
            return controller.close();
          }

          const newTokensLimit = Math.max(
            0,
            userTokenUsage.tokensLimit - totalTokens,
          );
          const newTotalTokens = Math.max(
            0,
            userTokenUsage.totalTokens + totalTokens,
          );
          await pool.query(
            "UPDATE \"TokenUsage\" SET \"tokensLimit\" = $1, \"totalTokens\" = $2, \"updatedAt\" = NOW() WHERE \"userId\" = $3",
            [newTokensLimit, newTotalTokens, userId],
          );

          // ✅ 推送使用信息并结束
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ usage: usageInfo })}\n\n`,
            ),
          );
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
        catch (err: any) {
          controller.enqueue(
            encoder.encode(`data: [ERROR] ${err.message}\n\n`),
          );
          controller.close();
        }
      },
    });

    // 5️⃣ 返回流式响应（SSE）
    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  }
  catch (err: any) {
    console.error("OpenAI error:", err);
    return c.json({ error: err.message }, 500);
  }
}) satisfies GptRouteHandlerType<"getGptChat">;
