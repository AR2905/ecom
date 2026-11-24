import pino from "pino";
import { env } from "@/config/env";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "ecom" },
  redact: {
    paths: [
      "password",
      "*.password",
      "passwordHash",
      "*.passwordHash",
      "razorpaySignature",
      "*.razorpaySignature",
      "authorization",
      "cookie",
      "accessToken",
      "*.accessToken",
      "refreshToken",
      "*.refreshToken",
    ],
    censor: "[REDACTED]",
  },
});

export function requestLogger(requestId: string) {
  return logger.child({ requestId });
}
