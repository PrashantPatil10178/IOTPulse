import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { prisma } from "./prisma.js";

class MosquittoConfigManager {
  constructor() {
    this.configPath =
      process.env.MOSQUITTO_CONFIG_PATH ||
      path.resolve(import.meta.dirname, "../../mosquitto/config");
    this.passwordFile = path.join(this.configPath, "passwd");
    this.aclFile = path.join(this.configPath, "acl");
  }

  async ensureConfigDirectory() {
    try {
      await fs.mkdir(this.configPath, { recursive: true });
    } catch (error) {
      console.error("Failed to create config directory:", error);
    }
  }

  async addDeviceCredentials(device) {
    try {
      await this.ensureConfigDirectory();

      // Get user information
      const user = await prisma.user.findUnique({
        where: { id: device.userId },
      });

      if (!user) {
        throw new Error(`User not found for device ${device.id}`);
      }

      // Username format: devicename
      const mqttUsername = `${user.username}`;
      const mqttPassword = device.id;

      // Add to password file
      await this.addToPasswordFile(mqttUsername, mqttPassword);

      // Update ACL permissions
      await this.updateACLForDevice(device, user, mqttUsername);

      // Reload Mosquitto config (send SIGHUP)
      await this.reloadMosquitto();

      return {
        username: mqttUsername,
        password: mqttPassword,
        topics: {
          publish: [
            `iot/${user.username}/${device.id}/data`,
            `iot/${user.username}/${device.id}/status`,
          ],
          subscribe: [`iot/${user.id}/${device.id}/commands`],
        },
      };
    } catch (error) {
      console.error("❌ Failed to add device credentials:", {
        deviceId: device?.id,
        userId: device?.userId,
        error: error.message,
        stack: error.stack,
      });
      throw new Error(`addDeviceCredentials failed: ${error.message}`);
    }
  }

  async addToPasswordFile(username, password) {
    try {
      const cmd = `mosquitto_passwd -b ${this.passwordFile} ${username} ${password}`;
      exec(cmd, (error, stdout, stderr) => {
        if (error) {
          console.error("Error adding Mosquitto password:", error);
          throw error;
        }
      });
    } catch (error) {
      console.error("Failed to add password via mosquitto_passwd:", error);
      throw error;
    }
  }

  async updateACLForDevice(device, user, mqttUsername) {
    try {
      let aclContent = "";
      try {
        aclContent = await fs.readFile(this.aclFile, "utf8");
      } catch (error) {
        // File doesn't exist, start with admin permissions
        aclContent = `# ACL for IoT Dashboard
user admin
topic readwrite #

`;
      }

      const deviceTopics = [
        `topic write iot/${user.id}/${device.id}/data`,
        `topic write iot/${user.id}/${device.id}/status`,
        `topic read iot/${user.id}/${device.id}/commands`,
      ];

      // Ensure there's a 'user mqttUsername' block
      let userBlockRegex = new RegExp(
        `user ${mqttUsername}\\n([\\s\\S]*?)(?=\\nuser |$)`,
        "g"
      );
      let match = userBlockRegex.exec(aclContent);

      if (match) {
        // User block exists, append missing topic rules
        let userBlock = match[0];
        let updatedBlock = userBlock;

        for (const topicLine of deviceTopics) {
          if (!userBlock.includes(topicLine)) {
            updatedBlock += `${topicLine}\n`;
          }
        }

        if (userBlock !== updatedBlock) {
          aclContent = aclContent.replace(userBlock, updatedBlock);
          await fs.writeFile(this.aclFile, aclContent);
        } else {
          console.log(`All topics for device ${device.id} already exist.`);
        }
      } else {
        // User block doesn't exist, create new
        const deviceACL = `
# Device: ${device.name} (${device.id}) - User: ${user.username} (${user.id})
user ${mqttUsername}
${deviceTopics.join("\n")}

`;
        aclContent += deviceACL;
        await fs.writeFile(this.aclFile, aclContent);
      }
    } catch (error) {
      console.error("Failed to update ACL file:", error);
      throw error;
    }
  }

  async removeDeviceCredentials(deviceId, mqttUsername) {
    try {
      // Remove from password file
      let passwords = await fs.readFile(this.passwordFile, "utf8");
      const lines = passwords
        .split("\n")
        .filter((line) => line.trim() && !line.startsWith(`${mqttUsername}:`));
      await fs.writeFile(this.passwordFile, lines.join("\n") + "\n");

      // Remove from ACL file
      let aclContent = await fs.readFile(this.aclFile, "utf8");
      const aclLines = aclContent.split("\n");
      const filteredLines = [];
      let skipSection = false;

      for (const line of aclLines) {
        if (line.includes(`Device:`) && line.includes(`(${deviceId})`)) {
          skipSection = true;
          continue;
        }
        if (
          skipSection &&
          line.startsWith("user ") &&
          line.includes(mqttUsername)
        ) {
          skipSection = true;
          continue;
        }
        if (skipSection && (line.startsWith("topic ") || line.trim() === "")) {
          continue;
        }
        if (
          skipSection &&
          line.startsWith("user ") &&
          !line.includes(mqttUsername)
        ) {
          skipSection = false;
        }
        if (!skipSection) {
          filteredLines.push(line);
        }
      }

      await fs.writeFile(this.aclFile, filteredLines.join("\n"));
      await this.reloadMosquitto();
    } catch (error) {
      console.error("Failed to remove device credentials:", error);
    }
  }

  async reloadMosquitto() {
    try {
      // In Docker environment, you might need to restart the container
      // or use docker exec to send SIGHUP
      const { exec } = await import("child_process");
      exec("docker exec mosquitto_container kill -HUP 1", (error) => {
        if (error) {
          console.log(
            "Could not reload Mosquitto config, restart may be needed"
          );
        }
      });
    } catch (error) {
      console.log("Mosquitto reload skipped - container management required");
    }
  }
}

export const mosquittoConfig = new MosquittoConfigManager();
