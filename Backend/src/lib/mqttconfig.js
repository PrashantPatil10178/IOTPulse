import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { prisma } from "./prisma.js";

console.log("MosquittoConfigManager initialized");
console.log(path.resolve(import.meta.dirname, "../../mosquitto/config"));

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

  async generateMosquittoConfig() {
    const configContent = `
# Mosquitto Configuration for IoT Dashboard

# Basic settings
port 1883
allow_anonymous false
password_file ${this.passwordFile}
acl_file ${this.aclFile}

# Logging
log_dest file /mosquitto/log/mosquitto.log
log_type error
log_type warning
log_type notice
log_type information
connection_messages true
log_timestamp true

# Security
allow_duplicate_messages false
`;

    const configFile = path.join(this.configPath, "mosquitto.conf");
    await fs.writeFile(configFile, configContent.trim());
  }

  async addDeviceCredentials(device) {
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
      // Read existing ACL
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

      // Add device permissions with iot/userid/deviceid format
      const deviceACL = `
# Device: ${device.name} (${device.id}) - User: ${user.username} (${user.id})
user ${mqttUsername}
topic write iot/${user.id}/${device.id}/data
topic write iot/${user.id}/${device.id}/status
topic read iot/${user.id}/${device.id}/commands

`;

      // Check if device ACL already exists
      if (!aclContent.includes(`user ${mqttUsername}`)) {
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
