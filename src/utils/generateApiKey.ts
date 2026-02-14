import crypto from "crypto";

export const generateApiKey = (): string => {
  return "sk_live_" + crypto.randomBytes(24).toString("hex");
};
