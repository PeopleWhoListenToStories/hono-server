import CryptoJS from "crypto-js";

import env from "@/env";

export const decryptCollabToken = (token: string) => {
  try {
    const bytes = CryptoJS.AES.decrypt(token, env.GPT_API_AUTH_KEY);
    const decryptedData = bytes.toString(CryptoJS.enc.Utf8);
    const result = JSON.parse(decryptedData);
    const tokenExpiredInMilliseconds = 1000 * (Number(env.TOKEN_EXPIRED_IN_SECONDS || 60 * 1));
    if (Date.now() - result.dt > tokenExpiredInMilliseconds)
      throw new Error("Token expired");
    return result;
  }
  catch (err: any) {
    console.error("❌ Token 解密失败:", err.message);
    return null;
  }
};
