#!/usr/bin/env bun

import { writeFile } from "fs/promises";

interface DeviceConfig {
  id: string;
  name: string;
  type: string;
}

interface SimulatorStats {
  totalSent: number;
  totalFailed: number;
  startTime: number;
  cycleCount: number;
}

type FirstCycleLog = {
  deviceId: string;
  deviceName: string;
  sentData: any;
  responseStatus: number | null;
  responseBody: string | null;
};

class IoTSimulator {
  private readonly config = {
    user: "Prashant178",
    apiKey: "d9fb83a35cf25ea8ca0942b5468cf019012fc70842d18a3dd885453e5ce0f600",
    authHeader:
      "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIwMWQ4NDJkOC0yODI1LTQxZDctYWZlMC1lYWNjZDVjZTI3NTgiLCJpYXQiOjE3NDgwNzg0NDgsImV4cCI6MTc0ODE2NDg0OH0.hqiqw5URioppUyM1h1cSkD5wvb0FhLMfJYY7O1KXhN8",
    endpoint: "http://localhost:3001/api/data",
    sendInterval: 1000, // 1 second
    requestTimeout: 5000, // 5 seconds
    maxRetries: 2,
    firstCycleLogFile: "first_cycle_results.json",
  };

  private readonly devices: DeviceConfig[] = [
    {
      id: "3a73c501-4fee-4799-8292-492c0f7aafa8",
      name: "Temperature Sensor",
      type: "temperature",
    },
    {
      id: "ebdc1691-e39a-4f51-8411-7e4b2f37631d",
      name: "Humidity Sensor",
      type: "humidity",
    },
    {
      id: "7d26a781-1e9d-41a0-997a-97bdb403cece",
      name: "Motion Detector",
      type: "motion",
    },
    {
      id: "11b11e1c-2191-4ad9-9489-e2a88b271952",
      name: "Smart Light",
      type: "light",
    },
    {
      id: "1b4061ed-e013-4982-ba24-fd4f19e55da4",
      name: "Smart Plug",
      type: "plug",
    },
    {
      id: "e43ab856-45d2-4c82-a225-68f963f66f91",
      name: "Camera",
      type: "camera",
    },
    {
      id: "f7631d3f-0201-42df-b23c-7b1f4646d924",
      name: "Energy Meter",
      type: "energy",
    },
    {
      id: "073c6775-fbb9-4880-94d6-aa6ff0dcfa22",
      name: "Water Meter",
      type: "water",
    },
    {
      id: "9494f46f-3017-474b-ac8c-bc314f605679",
      name: "Vibration Sensor",
      type: "vibration",
    },
    {
      id: "e3c3ee3a-2263-4122-b142-0fce7f6eae68",
      name: "Pressure Sensor",
      type: "pressure",
    },
  ];

  private stats: SimulatorStats = {
    totalSent: 0,
    totalFailed: 0,
    startTime: Date.now(),
    cycleCount: 0,
  };

  private isRunning = false;
  private intervalId?: Timer;
  private firstCycleLogged = false;
  private firstCycleResults: FirstCycleLog[] = [];

  // --- Utility Methods ---
  private randomFloat(min: number, max: number, precision = 1): number {
    return Number((Math.random() * (max - min) + min).toFixed(precision));
  }

  private randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private randomChoice<T>(array: T[]): T {
    if (array.length === 0) throw new Error("Cannot choose from empty array");
    return array[Math.floor(Math.random() * array.length)]!;
  }

  private getCurrentTimestamp(): string {
    return new Date().toISOString();
  }

  private log(
    level: "INFO" | "WARN" | "ERROR" | "SUCCESS",
    message: string
  ): void {
    const timestamp = new Date()
      .toISOString()
      .replace("T", " ")
      .substring(0, 19);
    const colors = {
      INFO: "\x1b[36m", // Cyan
      WARN: "\x1b[33m", // Yellow
      ERROR: "\x1b[31m", // Red
      SUCCESS: "\x1b[32m", // Green
      RESET: "\x1b[0m",
    };
    console.log(
      `${colors[level]}[${level}]${colors.RESET} [${timestamp}] ${message}`
    );
  }

  // --- Data Generators ---
  private generateTemperatureData() {
    return {
      temperature: this.randomFloat(20, 35),
      unit: "celsius",
      humidity: this.randomFloat(50, 80),
      pressure: this.randomFloat(1000, 1020),
    };
  }

  private generateHumidityData() {
    return {
      humidity: this.randomFloat(60, 85),
      unit: "percent",
      temperature: this.randomFloat(20, 30),
      dewPoint: this.randomFloat(15, 20),
    };
  }

  private generateMotionData() {
    const zones = [
      "assembly_line_1",
      "assembly_line_2",
      "warehouse",
      "entrance",
      "parking",
    ];
    return {
      motion: Math.random() > 0.5,
      confidence: this.randomInt(80, 95),
      duration: this.randomFloat(2, 10),
      sensitivity: this.randomInt(5, 10),
      zone: this.randomChoice(zones),
    };
  }

  private generateSmartLightData() {
    const isOn = Math.random() > 0.5;
    const brightness = this.randomInt(50, 100);
    return {
      status: isOn ? "on" : "off",
      brightness,
      color: { r: 255, g: 255, b: 255 },
      colorTemperature: this.randomInt(3000, 6000),
      powerConsumption: this.randomFloat(10, 20),
      dimLevel: brightness,
    };
  }

  private generateSmartPlugData() {
    return {
      status: Math.random() > 0.5 ? "on" : "off",
      powerConsumption: this.randomFloat(1000, 1500),
      voltage: 230,
      current: this.randomFloat(4, 7, 2),
      totalEnergyUsed: this.randomFloat(300, 400),
      schedule: { enabled: true, onTime: "06:00", offTime: "18:00" },
    };
  }

  private generateCameraData() {
    const statuses = ["recording", "idle", "offline"];
    return {
      status: this.randomChoice(statuses),
      resolution: "1920x1080",
      fps: this.randomInt(15, 30),
      motionDetected: Math.random() > 0.5,
      nightVision: true,
      batteryLevel: this.randomInt(80, 100),
      storageUsed: this.randomInt(100, 200),
      recordingDuration: this.randomInt(300, 600),
    };
  }

  private generateEnergyMeterData() {
    return {
      powerUsage: this.randomFloat(3000, 5000),
      totalEnergy: this.randomFloat(15000, 20000),
      voltage: 230,
      current: this.randomFloat(15, 20, 2),
      frequency: 50,
      powerFactor: this.randomFloat(0.95, 0.99, 3),
      cost: this.randomFloat(400, 600, 2),
      peakDemand: this.randomFloat(4000, 6000),
      timestamp: this.getCurrentTimestamp(),
    };
  }

  private generateWaterMeterData() {
    return {
      flowRate: this.randomFloat(20, 40),
      totalVolume: this.randomFloat(9000, 10000),
      pressure: this.randomFloat(2, 4, 2),
      temperature: this.randomFloat(15, 20),
      quality: {
        ph: this.randomFloat(6.8, 7.2, 2),
        turbidity: this.randomFloat(0.5, 1.0, 2),
        tds: this.randomInt(180, 220),
      },
      leakDetected: Math.random() < 0.1,
    };
  }

  private generateVibrationData() {
    return {
      sensorType: "vibration",
      primaryMetric: {
        name: "vibration_intensity",
        value: this.randomFloat(0.5, 1.5, 2),
        unit: "mm/s",
        min: 0,
        max: 10,
      },
      secondaryMetrics: [
        {
          name: "frequency",
          value: this.randomInt(100, 150),
          unit: "Hz",
          min: 0,
          max: 1000,
        },
        {
          name: "temperature",
          value: this.randomFloat(25, 35),
          unit: "celsius",
          min: 0,
          max: 100,
        },
      ],
      status: "active",
      batteryLevel: this.randomInt(90, 95),
      signalStrength: this.randomInt(85, 95),
      metadata: {
        location: "Machine Shop A",
        notes: "Monitoring conveyor motor",
        calibrationDate: "2025-05-15T00:00:00Z",
        firmware: "v2.1.0",
      },
    };
  }

  private generatePressureData() {
    return {
      sensorType: "pressure",
      primaryMetric: {
        name: "pressure",
        value: this.randomFloat(3, 5, 2),
        unit: "bar",
        min: 0,
        max: 10,
      },
      secondaryMetrics: [
        {
          name: "flow_rate",
          value: this.randomFloat(10, 20),
          unit: "L/min",
          min: 0,
          max: 50,
        },
        {
          name: "temperature",
          value: this.randomFloat(20, 30),
          unit: "celsius",
          min: -10,
          max: 80,
        },
      ],
      status: "active",
      batteryLevel: this.randomInt(90, 95),
      signalStrength: this.randomInt(85, 95),
      metadata: {
        location: "Pipeline Section B",
        notes: "Monitoring hydraulic system",
        calibrationDate: "2025-05-20T00:00:00Z",
        firmware: "v1.3.2",
      },
      timestamp: this.getCurrentTimestamp(),
    };
  }

  private getDataForDevice(deviceType: string): any {
    switch (deviceType) {
      case "temperature":
        return this.generateTemperatureData();
      case "humidity":
        return this.generateHumidityData();
      case "motion":
        return this.generateMotionData();
      case "light":
        return this.generateSmartLightData();
      case "plug":
        return this.generateSmartPlugData();
      case "camera":
        return this.generateCameraData();
      case "energy":
        return this.generateEnergyMeterData();
      case "water":
        return this.generateWaterMeterData();
      case "vibration":
        return this.generateVibrationData();
      case "pressure":
        return this.generatePressureData();
      default:
        throw new Error(`Unknown device type: ${deviceType}`);
    }
  }

  // --- HTTP Send with First Cycle Save ---
  private async sendData(
    device: DeviceConfig,
    data: any,
    logFirst = false
  ): Promise<{
    success: boolean;
    responseBody?: any;
    responseStatus?: number;
  }> {
    const url = `${this.config.endpoint}/${this.config.user}/${device.id}`;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(
          () => controller.abort(),
          this.config.requestTimeout
        );

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "x-api-key": this.config.apiKey,
            "Content-Type": "application/json",
            Authorization: this.config.authHeader,
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          this.stats.totalSent++;
          if (logFirst) {
            let respText;
            try {
              respText = await response.text();
            } catch (e) {
              respText = "<Failed to parse response body>";
            }
            this.firstCycleResults.push({
              deviceId: device.id,
              deviceName: device.name,
              sentData: data,
              responseStatus: response.status,
              responseBody: respText,
            });
            return {
              success: true,
              responseBody: respText,
              responseStatus: response.status,
            };
          }
          return { success: true };
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        if (attempt === this.config.maxRetries) {
          this.stats.totalFailed++;
          if (logFirst) {
            this.firstCycleResults.push({
              deviceId: device.id,
              deviceName: device.name,
              sentData: data,
              responseStatus: null,
              responseBody: `<Failed - ${error}>`,
            });
            return { success: false, responseBody: `<Failed - ${error}>` };
          }
          return { success: false };
        }
      }
    }
    return { success: false };
  }

  // --- Main Simulation Cycle ---
  private async runSimulationCycle(): Promise<void> {
    const cycleStart = Date.now();
    this.stats.cycleCount++;

    // For the first cycle, save first data and response
    const logFirst = !this.firstCycleLogged;
    if (logFirst) this.firstCycleLogged = true;

    const sendPromises = this.devices.map(async (device) => {
      const data = this.getDataForDevice(device.type);
      return this.sendData(device, data, logFirst);
    });

    await Promise.allSettled(sendPromises);

    // If this was the first cycle, save all results to file
    if (logFirst) {
      try {
        await writeFile(
          this.config.firstCycleLogFile,
          JSON.stringify(this.firstCycleResults, null, 2),
          "utf-8"
        );
        this.log(
          "SUCCESS",
          `First cycle device data and responses saved to '${this.config.firstCycleLogFile}'`
        );
      } catch (err) {
        this.log("ERROR", `Failed to write first cycle log file: ${err}`);
      }
    }

    const cycleTime = Date.now() - cycleStart;
    const successful = this.stats.totalSent;
    const failed = this.stats.totalFailed;

    this.log(
      "SUCCESS",
      `Cycle #${this.stats.cycleCount} complete: ${successful} sent, ${failed} failed (${cycleTime}ms)`
    );

    // Real-time statistics every 10 cycles
    if (this.stats.cycleCount % 10 === 0) {
      this.printQuickStats();
    }
  }

  // --- Statistics and Monitoring ---
  private printQuickStats(): void {
    const runtime = Date.now() - this.stats.startTime;
    const runtimeSec = Math.floor(runtime / 1000);
    const total = this.stats.totalSent + this.stats.totalFailed;
    const successRate =
      total > 0 ? Math.round((this.stats.totalSent / total) * 100) : 0;
    const requestsPerSec =
      total > 0 ? Math.round(total / (runtimeSec || 1)) : 0;

    this.log(
      "INFO",
      `📊 Runtime: ${runtimeSec}s | Cycles: ${this.stats.cycleCount} | ` +
        `Sent: ${this.stats.totalSent} | Failed: ${this.stats.totalFailed} | ` +
        `Success: ${successRate}% | Rate: ${requestsPerSec} req/s`
    );
  }

  private printDetailedStats(): void {
    const runtime = Date.now() - this.stats.startTime;
    const hours = Math.floor(runtime / 3600000);
    const minutes = Math.floor((runtime % 3600000) / 60000);
    const seconds = Math.floor((runtime % 60000) / 1000);

    console.log("\n🚀 === IoT Simulator Final Statistics ===");
    console.log(`⏱️  Runtime: ${hours}h ${minutes}m ${seconds}s`);
    console.log(`🔄 Total cycles: ${this.stats.cycleCount}`);
    console.log(`📤 Messages sent: ${this.stats.totalSent}`);
    console.log(`❌ Messages failed: ${this.stats.totalFailed}`);

    const total = this.stats.totalSent + this.stats.totalFailed;
    if (total > 0) {
      console.log(
        `📊 Success rate: ${Math.round((this.stats.totalSent / total) * 100)}%`
      );
      console.log(
        `⚡ Average rate: ${Math.round(
          total / (runtime / 1000)
        )} requests/second`
      );
    }

    console.log(`🎯 Expected rate: ${this.devices.length} devices/second`);
    console.log("=========================================\n");
  }

  // --- Public Methods ---
  public async start(): Promise<void> {
    if (this.isRunning) {
      this.log("WARN", "Simulator is already running");
      return;
    }

    this.log("INFO", "🚀 Starting High-Performance IoT Device Simulator");
    this.log("INFO", `📡 Endpoint: ${this.config.endpoint}`);
    this.log(
      "INFO",
      `⚡ Send interval: ${this.config.sendInterval}ms (${this.devices.length} devices/second)`
    );
    this.log("INFO", `🔧 Devices configured: ${this.devices.length}`);
    this.log("INFO", `⏱️  Request timeout: ${this.config.requestTimeout}ms`);

    this.isRunning = true;
    this.stats.startTime = Date.now();

    // Test connectivity first
    await this.testConnectivity();

    // Start the main simulation loop
    this.intervalId = setInterval(async () => {
      if (this.isRunning) {
        await this.runSimulationCycle();
      }
    }, this.config.sendInterval);

    this.log(
      "SUCCESS",
      "✅ Simulator started successfully! Press Ctrl+C to stop."
    );
  }

  private async testConnectivity(): Promise<void> {
    this.log("INFO", "🔍 Testing connectivity...");
    const testDevice = this.devices[0];
    if (!testDevice) {
      this.log("ERROR", "❌ No devices configured for testing");
      return;
    }
    const testData = this.getDataForDevice(testDevice.type);

    // Don't save the connectivity test to firstCycleResults
    const result = await this.sendData(testDevice, testData, false);
    if (result.success) {
      this.log("SUCCESS", "✅ Connectivity test passed");
    } else {
      this.log("ERROR", "❌ Connectivity test failed - continuing anyway");
    }
  }

  public async testMode(): Promise<void> {
    this.log("INFO", "🧪 Running in test mode (single cycle)");
    await this.runSimulationCycle();
    this.printDetailedStats();
  }

  public stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.log("INFO", "🛑 Stopping IoT simulator...");
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.printDetailedStats();
  }

  public getStats(): SimulatorStats {
    return { ...this.stats };
  }
}

// --- CLI Interface ---
class CLI {
  private simulator = new IoTSimulator();

  private showHelp(): void {
    console.log(`
🚀 High-Performance IoT Device Data Simulator (Bun.js)

📡 Sends data for 10 IoT devices every second with parallel processing

Usage: bun run iot_simulator.ts [OPTIONS]

OPTIONS:
  -h, --help     Show this help message
  -t, --test     Test mode - send one cycle and exit
  -s, --stats    Show current statistics and exit
  -v, --version  Show version information

FEATURES:
  ⚡ Ultra-fast native fetch API
  📊 Real-time statistics every 10 seconds
  🔄 Parallel request processing
  🛡️  Error handling with retries
  📱 10 different IoT device types

EXAMPLES:
  bun run iot_simulator.ts          # Start the simulator
  bun run iot_simulator.ts -t       # Test mode - one cycle only
  bun run iot_simulator.ts -s       # Show statistics

📧 Configured for user: Prashant178
🌐 Target endpoint: http://localhost:3001/api/data
    `);
  }

  private showVersion(): void {
    console.log("IoT Simulator v2.0.0 - High Performance Edition");
    console.log("Built with Bun.js and native fetch API");
    console.log(`Bun version: ${Bun.version}`);
  }

  public async run(args: string[]): Promise<void> {
    // Setup graceful shutdown
    process.on("SIGINT", () => {
      console.log("\n");
      this.simulator.stop();
      process.exit(0);
    });

    process.on("SIGTERM", () => {
      this.simulator.stop();
      process.exit(0);
    });

    // Parse arguments
    if (args.includes("--help") || args.includes("-h")) {
      this.showHelp();
      return;
    }

    if (args.includes("--version") || args.includes("-v")) {
      this.showVersion();
      return;
    }

    if (args.includes("--stats") || args.includes("-s")) {
      const stats = this.simulator.getStats();
      console.log("Current Statistics:", stats);
      return;
    }

    if (args.includes("--test") || args.includes("-t")) {
      await this.simulator.testMode();
      return;
    }

    // Start the main simulator
    await this.simulator.start();

    // Keep the process alive
    process.stdin.resume();
  }
}

// --- Entrypoint ---
if (import.meta.main) {
  const cli = new CLI();
  cli.run(process.argv.slice(2)).catch(console.error);
}

export { IoTSimulator };
