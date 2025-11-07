import * as CryptoJS from "crypto-js";

import env from "@/env";

export const decryptCollabToken = (token: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(token, env.GPT_API_AUTH_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    const result = JSON.parse(decryptedData);
    if (Date.now() - result.dt > 10 * 60 * 1000)
      throw new Error("Token expired");
    return result;
  }
  catch (err: any) {
    console.error("❌ Token 解密失败:", err.message);
    return null;
  }
};
