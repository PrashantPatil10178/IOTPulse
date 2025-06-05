import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

export const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log("Authorization header:", authHeader);

    if (!authHeader) {
      return res.status(401).json({ error: "Authorization header missing" });
    }

    if (authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await prisma.user.findUnique({
          where: { id: decoded.userId },
          select: { id: true, email: true, fullName: true, role: true },
        });

        if (!user) {
          return res.status(401).json({ error: "User not found" });
        }

        req.user = user;
        return next();
      } catch (error) {
        return res.status(401).json({ error: "Invalid token" });
      }
    }
    // Check if it's an API key
    else {
      const apiKey = authHeader;

      // Find the API key in the database
      const apiKeyRecord = await prisma.apiKey.findUnique({
        where: { key: apiKey },
        include: { user: true },
      });

      if (!apiKeyRecord) {
        return res.status(401).json({ error: "Invalid API key" });
      }

      // Update last used timestamp
      await prisma.apiKey.update({
        where: { id: apiKeyRecord.id },
        data: { lastUsedAt: new Date() },
      });

      req.user = {
        id: apiKeyRecord.user.id,
        email: apiKeyRecord.user.email,
        fullName: apiKeyRecord.user.fullName,
        role: apiKeyRecord.user.role,
      };

      return next();
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({ error: "Authentication error" });
  }
};

export const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === "ADMIN") {
    return next();
  }

  return res.status(403).json({ error: "Access denied. Admin role required." });
};
