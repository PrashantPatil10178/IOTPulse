import { prisma } from "../lib/prisma.js";

/**
 * Middleware to authenticate requests using an API key.
 * Expects: `x-api-key` header.
 */
export async function authenticateApiKey(req, res, next) {
  try {
    const apiKey = req.header("x-api-key");

    if (!apiKey) {
      return res.status(401).json({ error: "API key is missing" });
    }

    const keyRecord = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: { user: true },
    });

    if (!keyRecord) {
      return res.status(403).json({ error: "Invalid API key" });
    }

    await prisma.apiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date() },
    });

    req.apiKey = keyRecord;
    req.user = keyRecord.user;
    next();
  } catch (error) {
    console.error("API key middleware error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
}
