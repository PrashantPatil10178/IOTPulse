"use client";

import type React from "react";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Check,
  Copy,
  X,
  Wifi,
  Globe,
  Radio,
  Play,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Settings,
  Key,
  Plus,
  Trash2,
  Code,
  Cpu,
  Zap,
  Database,
  ExternalLink,
  Download,
  BookOpen,
  WifiOff,
  Info, // Added for instructions modal
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api, API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

interface DeviceData {
  id: string;
  name: string;
  type: "TEMPERATURE_SENSOR" | "HUMIDITY_SENSOR" | "MOTION_DETECTOR" | "OTHER";
  location: string;
  accessToken: string;
  deviceKey: string;
}

interface TelemetryData {
  timestamp: string;
  key: string;
  value: string | number;
  type: "string" | "number" | "boolean";
  unit?: string;
}

interface SensorData {
  id: string;
  deviceId: string;
  metric: string;
  value: number;
  unit: string;
  timestamp: string;
}

interface ApiResponse {
  success: boolean;
  message: string;
  data: {
    device: {
      id: string;
      name: string;
      type: string;
      status: string;
      location: string;
      coordinates: string;
      lastSeen: string;
    };
    sensorData: SensorData[];
    totalEntries: number;
  };
  timestamp: string;
}

interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  key: string;
  createdAt: string;
  lastUsedAt?: string;
}

interface Protocol {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  port: string;
  secure: boolean;
}

interface IDE {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  description: string;
  features: string[];
  downloadUrl: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
}

const protocols: Protocol[] = [
  {
    id: "http",
    name: "HTTP",
    icon: Globe,
    description: "RESTful API over HTTP/HTTPS",
    port: "3001",
    secure: true,
  },
  {
    id: "mqtt",
    name: "MQTT",
    icon: Radio,
    description: "Lightweight messaging protocol",
    port: "1883",
    secure: true,
  },
  {
    id: "coap",
    name: "CoAP",
    icon: Wifi,
    description: "Constrained Application Protocol",
    port: "5683",
    secure: false,
  },
];

const iotIDEs: IDE[] = [
  {
    id: "arduino",
    name: "Arduino IDE",
    icon: Code,
    color: "text-teal-600",
    bgColor: "bg-teal-50 dark:bg-teal-950/30",
    description:
      "The classic Arduino development environment with built-in libraries and examples",
    features: [
      "Easy to use",
      "Built-in examples",
      "Library manager",
      "Serial monitor",
    ],
    downloadUrl: "https://arduino.cc",
    difficulty: "Beginner",
  },
  {
    id: "platformio",
    name: "PlatformIO",
    icon: Cpu,
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/30",
    description:
      "Professional IoT development platform with advanced debugging and testing",
    features: [
      "VS Code integration",
      "Advanced debugging",
      "Unit testing",
      "Multi-platform",
    ],
    downloadUrl: "https://platformio.org",
    difficulty: "Advanced",
  },
  {
    id: "thingsboard",
    name: "ThingsBoard",
    icon: Database,
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    description:
      "Enterprise IoT platform for device management and data visualization",
    features: [
      "Device management",
      "Real-time dashboards",
      "Rule engine",
      "API gateway",
    ],
    downloadUrl: "https://thingsboard.io",
    difficulty: "Intermediate",
  },
  {
    id: "esphome",
    name: "ESPHome",
    icon: Zap,
    color: "text-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    description: "YAML-based configuration system for ESP8266/ESP32 devices",
    features: [
      "YAML configuration",
      "Home Assistant integration",
      "OTA updates",
      "Web interface",
    ],
    downloadUrl: "https://esphome.io",
    difficulty: "Intermediate",
  },
];

// Helper to generate payload string for Arduino C++
const getArduinoPayloadString = (deviceType: DeviceData["type"]): string => {
  switch (deviceType) {
    case "TEMPERATURE_SENSOR":
      return `{\\"temperature\\": 25.5, \\"unit\\": \\"celsius\\", \\"humidity\\": 60.0}`;
    case "HUMIDITY_SENSOR":
      return `{\\"humidity\\": 70.0, \\"unit\\": \\"percent\\", \\"temperature\\": 22.5}`;
    case "MOTION_DETECTOR":
      return `{\\"motion\\": 1, \\"confidence\\": 95.0, \\"duration\\": 10}`;
    case "OTHER":
    default:
      return `{\\"metric\\": \\"custom_metric\\", \\"value\\": 123.45, \\"unit\\": \\"custom_unit\\"}`;
  }
};

const getPayloadObject = (deviceType: DeviceData["type"]): object => {
  switch (deviceType) {
    case "TEMPERATURE_SENSOR":
      return { temperature: 25.5, unit: "celsius", humidity: 60.0 };
    case "HUMIDITY_SENSOR":
      return { humidity: 70.0, unit: "percent", temperature: 22.5 };
    case "MOTION_DETECTOR":
      return { motion: 1, confidence: 95.0, duration: 10 };
    case "OTHER":
    default:
      return { metric: "custom_metric", value: 123.45, unit: "custom_unit" };
  }
};

export function DeviceConnectivityWizard({
  device,
  onClose,
  onComplete,
}: {
  device: DeviceData;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [selectedProtocol, setSelectedProtocol] = useState("http");
  const [selectedIDE, setSelectedIDE] = useState("arduino");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    "idle" | "connecting" | "connected" | "failed" | "no-data"
  >("idle");
  const [telemetryData, setTelemetryData] = useState<TelemetryData[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [showApiKeyForm, setShowApiKeyForm] = useState(false);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [isCreatingKey, setIsCreatingKey] = useState(false);
  const [customEndpoint, setCustomEndpoint] = useState("");
  const [customPort, setCustomPort] = useState("");
  const [useSSL, setUseSSL] = useState(true);
  const [showDataFormatModal, setShowDataFormatModal] = useState(false); // New state for instructions modal

  const { user } = useAuth();

  const currentProtocol = protocols.find((p) => p.id === selectedProtocol);
  const currentIDE = iotIDEs.find((ide) => ide.id === selectedIDE);

  useEffect(() => {
    fetchApiKeys();
  }, []);

  const fetchApiKeys = async () => {
    try {
      setIsLoadingKeys(true);
      const response = await api.get("/settings/api-keys");
      setApiKeys(response.data);
    } catch (error) {
      console.error("Failed to fetch API keys:", error);
      toast.error("Failed to load API keys");
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key");
      return;
    }

    try {
      setIsCreatingKey(true);
      const response = await api.post("/settings/api-keys", {
        name: newKeyName.trim(),
      });

      setApiKeys([...apiKeys, response.data]);
      setNewKeyName("");
      setShowApiKeyForm(false);
      toast.success("API key created successfully!");
    } catch (error: any) {
      console.error("Failed to create API key:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to create API key";
      toast.error(errorMessage);
    } finally {
      setIsCreatingKey(false);
    }
  };

  const deleteApiKey = async (id: string) => {
    try {
      await api.delete(`/settings/api-keys/${id}`);
      setApiKeys(apiKeys.filter((key) => key.id !== id));
      toast.success("API key deleted successfully");
    } catch (error: any) {
      console.error("Failed to delete API key:", error);
      const errorMessage =
        error.response?.data?.error || "Failed to delete API key";
      toast.error(errorMessage);
    }
  };

  const copyApiKey = (prefix: string) => {
    navigator.clipboard.writeText(`${prefix}_your_full_api_key`);
    toast.success("API key prefix copied to clipboard!");
  };

  const getConnectionCommand = () => {
    const baseUrl = customEndpoint || API_BASE_URL;
    const port = customPort || currentProtocol?.port || "3001";
    const protocol = useSSL && selectedProtocol === "http" ? "https" : "http";
    const apiKeyPrefix = apiKeys[0]?.key || "YOUR_API_KEY"; // Use the actual key for testing, not prefix
    const urlPath = `/data/${user?.username}/${device.id}`;

    const arduinoPayloadStr = getArduinoPayloadString(device.type);
    const genericPayloadObj = getPayloadObject(device.type);
    const genericPayloadJson = JSON.stringify(
      genericPayloadObj,
      null,
      2
    ).replace(/\n/g, "\n    "); // For curl/Python
    const esphomePayloadJson = JSON.stringify(genericPayloadObj).replace(
      /"/g,
      '\\"'
    );

    switch (selectedProtocol) {
      case "http":
        switch (selectedIDE) {
          case "arduino":
            return `// Arduino HTTP Client for ${device.type}
#include <WiFi.h>
#include <HTTPClient.h>

HTTPClient http;
// Note: For ESP32, you might need to provide the root CA certificate for HTTPS
// http.begin("${protocol}://${baseUrl}${urlPath}", rootCACertificate);
http.begin("${protocol}://${baseUrl}${urlPath}");
http.addHeader("Content-Type", "application/json");
http.addHeader("x-api-key", "${apiKeyPrefix}");

String payload = "${arduinoPayloadStr}";
int httpResponseCode = http.POST(payload);

if (httpResponseCode > 0) {
  Serial.printf("[HTTP] POST... code: %d\\n", httpResponseCode);
  if (httpResponseCode == HTTP_CODE_OK || httpResponseCode == HTTP_CODE_CREATED) {
    String response = http.getString();
    Serial.println(response);
  }
} else {
  Serial.printf("[HTTP] POST... failed, error: %s\\n", http.errorToString(httpResponseCode).c_str());
}
http.end();`;

          case "platformio": // Python example
            return `# PlatformIO HTTP Request (Python) for ${device.type}
import requests
import json

url = "${protocol}://${baseUrl}:${port}${urlPath}"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "${apiKeyPrefix}"
}
data = ${JSON.stringify(genericPayloadObj, null, 4)}

try:
    response = requests.post(url, headers=headers, json=data, timeout=10)
    response.raise_for_status()  # Raises an exception for HTTP errors
    print(f"Success: {response.json()}")
except requests.exceptions.RequestException as e:
    print(f"Error: {e}")`;

          case "thingsboard": // cURL example
            return `// ThingsBoard Integration (using cURL) for ${device.type}
curl -v -X POST ${protocol}://${baseUrl}:${port}${urlPath} \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${apiKeyPrefix}" \\
  -d '${genericPayloadJson}'`;

          case "esphome":
            let esphomeSensorSpecificPayloadHttp = "";
            if (device.type === "TEMPERATURE_SENSOR") {
              esphomeSensorSpecificPayloadHttp = `
                temperature: !lambda 'return id(my_temp_sensor).state;'
                humidity: !lambda 'return id(my_humidity_sensor).state;' # Assuming you have a humidity sensor
                unit: "celsius" 
              `;
            } else if (device.type === "HUMIDITY_SENSOR") {
              esphomeSensorSpecificPayloadHttp = `
                humidity: !lambda 'return id(my_humidity_sensor).state;'
                unit: "percent" 
                temperature: !lambda 'return id(my_temp_sensor).state;' # Assuming temp sensor
               `;
            } else if (device.type === "MOTION_DETECTOR") {
              esphomeSensorSpecificPayloadHttp = `
                motion: !lambda 'return id(my_motion_sensor).state ? 1 : 0;' 
                # confidence: ... (if available)
                # duration: ... (if available)
              `;
            } else {
              // OTHER
              esphomeSensorSpecificPayloadHttp = `
                metric: "my_metric" 
                value: !lambda 'return id(my_generic_sensor).state;'
                unit: "my_units"
              `;
            }
            return `# ESPHome Configuration for ${device.type}
# Ensure you have sensors defined in ESPHome, e.g.,
# sensor:
#   - platform: dht # or other sensor platform
#     pin: D2
#     temperature:
#       name: "Living Room Temperature"
#       id: my_temp_sensor
#     humidity:
#       name: "Living Room Humidity"
#       id: my_humidity_sensor
#   - platform: binary_sensor
#     # ... (for motion sensor)
#     id: my_motion_sensor
#   - platform: adc # For generic sensor
#     pin: A0
#     id: my_generic_sensor

# ... (wifi, api, ota sections as before) ...

# Example of sending data via http_request action
# This could be triggered by on_value from a sensor
# interval:
#   - interval: 60s
#     then:
#       - http_request.post:
#           url: ${protocol}://${baseUrl}:${port}${urlPath}
#           headers:
#             Content-Type: application/json
#             X-API-Key: "${apiKeyPrefix}"
#           json: |
#             {
#               ${esphomeSensorSpecificPayloadHttp
              .trim()
              .split("\n")
              .map((line) => `  ${line}`)
              .join("\n")}
#             }
`;
        }
        break;

      case "mqtt":
        const mqttTopic = `devices/${user?.username}/${device.id}/data`; // Example topic
        switch (selectedIDE) {
          case "arduino":
            return `// Arduino MQTT Client for ${device.type}
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h> // For easy JSON creation

WiFiClient espClient;
PubSubClient client(espClient);

const char* mqtt_server = "${baseUrl}";
const int mqtt_port = ${port};
const char* mqtt_topic = "${mqttTopic}";
// const char* mqtt_user = "${apiKeyPrefix}"; // MQTT username can be API key
// const char* mqtt_password = ""; // MQTT password if needed

void setup_mqtt() {
  client.setServer(mqtt_server, mqtt_port);
  // client.setCallback(callback); // If you need to receive messages
}

void publishTelemetry() {
  if (!client.connected()) {
    // Reconnect logic here (e.g., client.connect("ArduinoClient", mqtt_user, mqtt_password))
    Serial.println("MQTT not connected");
    return;
  }
  StaticJsonDocument<256> doc; // Adjust size as needed
  // Populate doc based on device.type
  doc["timestamp"] = String(millis()); // Example timestamp
  ${
    device.type === "TEMPERATURE_SENSOR"
      ? `doc["temperature"] = 25.5;\ndoc["unit"] = "celsius";\ndoc["humidity"] = 60.0;`
      : ""
  }
  ${
    device.type === "HUMIDITY_SENSOR"
      ? `doc["humidity"] = 70.0;\ndoc["unit"] = "percent";\ndoc["temperature"] = 22.5;`
      : ""
  }
  ${
    device.type === "MOTION_DETECTOR"
      ? `doc["motion"] = 1;\ndoc["confidence"] = 95.0;`
      : ""
  }
  ${
    device.type === "OTHER"
      ? `doc["metric"] = "custom_metric";\ndoc["value"] = 123.45;\ndoc["unit"] = "units";`
      : ""
  }
  
  String payload;
  serializeJson(doc, payload);
  
  if (client.publish(mqtt_topic, payload.c_str())) {
    Serial.println("MQTT message published");
  } else {
    Serial.println("MQTT publish failed");
  }
}`;

          case "platformio": // Python with Paho MQTT
            return `# PlatformIO MQTT (Python with Paho) for ${device.type}
import paho.mqtt.client as mqtt
import json
import time

MQTT_BROKER = "${baseUrl}"
MQTT_PORT = ${parseInt(port, 10)}
MQTT_TOPIC = "${mqttTopic}"
# MQTT_USERNAME = "${apiKeyPrefix}" # If API key is used as username
# MQTT_PASSWORD = "" # If password is required

client = mqtt.Client()
# if MQTT_USERNAME:
# client.username_pw_set(MQTT_USERNAME, MQTT_PASSWORD)

def on_connect(client, userdata, flags, rc):
    print(f"Connected to MQTT Broker with result code {rc}")

def on_publish(client, userdata, mid):
    print(f"Message {mid} published.")

client.on_connect = on_connect
client.on_publish = on_publish

try:
    client.connect(MQTT_BROKER, MQTT_PORT, 60)
    client.loop_start() # Start network loop

    payload = ${JSON.stringify(genericPayloadObj, null, 4)}
    # Add timestamp if not present
    if "timestamp" not in payload:
        payload["timestamp"] = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())

    (rc, mid) = client.publish(MQTT_TOPIC, json.dumps(payload))
    if rc == mqtt.MQTT_ERR_SUCCESS:
        print(f"Publish initiated for message id {mid}")
    else:
        print(f"Failed to publish, return code {rc}")
    
    time.sleep(2) # Give time for message to be sent
    client.loop_stop()
    client.disconnect()

except Exception as e:
    print(f"Error: {e}")`;

          case "thingsboard": // mosquitto_pub example
            return `# ThingsBoard MQTT (using mosquitto_pub) for ${device.type}
# Note: ThingsBoard often uses device access token as username
mosquitto_pub -h ${baseUrl} -p ${port} \\
  -t "${mqttTopic}" \\
  -u "${apiKeyPrefix}" \\ 
  -m '${genericPayloadJson}'`;

          case "esphome":
            let esphomeSensorSpecificPayloadMqtt = "";
            if (device.type === "TEMPERATURE_SENSOR") {
              esphomeSensorSpecificPayloadMqtt = `\\"temperature\\": !lambda 'return id(my_temp_sensor).state;', \\"unit\\": \\"celsius\\", \\"humidity\\": !lambda 'return id(my_humidity_sensor).state;'`;
            } else if (device.type === "HUMIDITY_SENSOR") {
              esphomeSensorSpecificPayloadMqtt = `\\"humidity\\": !lambda 'return id(my_humidity_sensor).state;', \\"unit\\": \\"percent\\", \\"temperature\\": !lambda 'return id(my_temp_sensor).state;'`;
            } else if (device.type === "MOTION_DETECTOR") {
              esphomeSensorSpecificPayloadMqtt = `\\"motion\\": !lambda 'return id(my_motion_sensor).state ? 1 : 0;'`;
            } else {
              // OTHER
              esphomeSensorSpecificPayloadMqtt = `\\"metric\\": \\"my_metric\\", \\"value\\": !lambda 'return id(my_generic_sensor).state;', \\"unit\\": \\"my_units\\"`;
            }
            return `# ESPHome MQTT Configuration for ${device.type}
# Ensure you have sensors defined in ESPHome (see HTTP example)

mqtt:
  broker: ${baseUrl}
  port: ${port}
  username: "${apiKeyPrefix}" # Or your MQTT username
  # password: "YOUR_MQTT_PASSWORD"
  topic_prefix: devices/${user?.username}/${device.id} # Example, adjust as needed

# Example of sending data via mqtt.publish action
# interval:
#   - interval: 60s
#     then:
#       - mqtt.publish:
#           topic: ${mqttTopic} # Full topic path
#           payload: !lambda |-
#             return "{ ${esphomeSensorSpecificPayloadMqtt} }";
`;
        }
        break;

      case "coap": // CoAP example (generic, adjust payload as needed)
        return `// CoAP Client Example for ${device.type}
// Ensure you have a CoAP client like libcoap or a command-line tool
// This example uses a generic JSON payload.
// You might need to adjust content format (e.g., -O 42 for CBOR if server supports it)

coap-cli post coap://${baseUrl}:${port}${urlPath} \\
  -t "application/json" \\
  -p '${genericPayloadJson}' \\
  -B 5 # Wait 5 seconds for response
# Add token for authentication if CoAP server requires it, e.g. via Uri-Query option
# -O "2052,token=${apiKeyPrefix}" # Hypothetical token option
`;
    }
    return `// Code for ${selectedProtocol} with ${selectedIDE} for ${
      device.type
    }
// Payload should be: ${JSON.stringify(getPayloadObject(device.type))}
// Please adapt the example for your specific setup.`;
  };

  const getInstallationInstructions = () => {
    switch (selectedIDE) {
      case "arduino":
        return "Download Arduino IDE from arduino.cc, install ESP32/ESP8266 board support via Board Manager, and add required libraries (WiFi, HTTPClient/PubSubClient, ArduinoJson)";
      case "platformio":
        return "Install PlatformIO IDE extension for VS Code, or use PlatformIO Core CLI. Add libraries like Paho-MQTT for MQTT. Supports advanced debugging, unit testing, and multiple frameworks";
      case "thingsboard":
        return "Use ThingsBoard Cloud (cloud.thingsboard.io) or install ThingsBoard Community Edition locally. For MQTT/HTTP, use standard tools like mosquitto_pub or cURL with the device access token (API Key).";
      case "esphome":
        return "Install ESPHome: pip install esphome, or use Home Assistant add-on. Configure devices using YAML files. Use http_request or mqtt.publish actions to send data.";
    }
    return "";
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "Advanced":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const testConnection = async () => {
    if (apiKeys.length === 0) {
      toast.error("Please create an API key first");
      return;
    }

    setIsConnecting(true);
    setConnectionStatus("connecting");
    setTelemetryData([]);

    try {
      const response = await api.get(
        `/data/${user?.username}/${device.id}/latest`,
        {
          headers: {
            // Ensure the first API key has its 'key' field populated correctly
            "x-api-key": apiKeys[0].key,
          },
        }
      );

      await new Promise((resolve) => setTimeout(resolve, 1500));

      if (response.data.success) {
        const {
          device: deviceInfo,
          sensorData,
          totalEntries,
        } = response.data.data;

        if (totalEntries === 0) {
          const deviceStatusData: TelemetryData[] = [
            {
              timestamp: deviceInfo.lastSeen || new Date().toISOString(),
              key: "device_status",
              value: "registered",
              type: "string" as const,
            },
            {
              timestamp: new Date().toISOString(),
              key: "data_status",
              value: "no data received",
              type: "string" as const,
            },
            {
              timestamp: new Date().toISOString(),
              key: "total_entries",
              value: totalEntries,
              type: "number" as const,
            },
          ];
          setTelemetryData(deviceStatusData);
          setConnectionStatus("no-data");
          toast.warning(
            "Device found but no sensor data received yet. Check if your device is sending data as per the format instructions."
          );
        } else {
          const transformedData: TelemetryData[] = sensorData.map(
            (sensor: SensorData) => ({
              timestamp: sensor.timestamp,
              key: sensor.metric,
              value: sensor.value,
              type:
                typeof sensor.value === "number"
                  ? "number"
                  : ("string" as const), // Basic type check
              unit: sensor.unit,
            })
          );

          const deviceStatusData: TelemetryData[] = [
            {
              timestamp: deviceInfo.lastSeen,
              key: "device_status",
              value: deviceInfo.status.toLowerCase(),
              type: "string" as const,
            },
            {
              timestamp: new Date().toISOString(),
              key: "total_entries_retrieved",
              value: totalEntries, // This is actually the count of retrieved entries
              type: "number" as const,
            },
          ];

          const allData = [...deviceStatusData, ...transformedData]
            .sort(
              (a, b) =>
                new Date(b.timestamp).getTime() -
                new Date(a.timestamp).getTime()
            )
            .slice(0, 10);

          setTelemetryData(allData);
          setConnectionStatus("connected");
          toast.success(
            `Connection successful! Displaying latest ${sensorData.length} sensor readings.`
          );
        }
      } else {
        setConnectionStatus("failed");
        toast.error(
          "API request failed: " + (response.data.message || "Unknown error")
        );
      }
    } catch (error: any) {
      console.error("Connection test failed:", error);
      setConnectionStatus("failed");
      if (error.response?.status === 401) {
        toast.error("Authentication failed. Please check your API key.");
      } else if (error.response?.status === 403) {
        toast.error(
          "Access denied. You don't have permission for this device."
        );
      } else if (error.response?.status === 404) {
        toast.error(
          "Device or endpoint not found. Please check the device ID and API configuration."
        );
      } else {
        toast.error(
          `Connection failed: ${
            error.message || "Please check your settings and try again."
          }`
        );
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(getConnectionCommand());
      toast.success("Command copied to clipboard!");
    } catch (error) {
      toast.error("Failed to copy command");
    }
  };

  const handleComplete = () => {
    if (dontShowAgain) {
      localStorage.setItem("iot-dashboard-skip-connectivity", "true");
    }
    onComplete();
  };

  const renderDataFormatInstructions = () => {
    let fields: {
      name: string;
      type: string;
      required: boolean;
      description?: string;
    }[] = [];
    let examplePayload: any = {};

    const commonOptional = [
      {
        name: "timestamp",
        type: "string (ISO 8601 datetime)",
        required: false,
        description:
          "e.g., YYYY-MM-DDTHH:mm:ss.sssZ. Records the time of the reading. If omitted, server uses current time.",
      },
      {
        name: "source",
        type: "string",
        required: false,
        description:
          "e.g., 'sensor-A123'. Identifier for the data source/sensor.",
      },
    ];

    switch (device.type) {
      case "TEMPERATURE_SENSOR":
        fields = [
          {
            name: "temperature",
            type: "number",
            required: true,
            description: "The temperature reading.",
          },
          {
            name: "unit",
            type: "string ('celsius' | 'fahrenheit' | 'kelvin')",
            required: false,
            description: "Default: 'celsius'.",
          },
          {
            name: "humidity",
            type: "number (0-100)",
            required: false,
            description: "Percentage humidity.",
          },
        ];
        examplePayload = { temperature: 25.5, unit: "celsius", humidity: 60 };
        break;
      case "HUMIDITY_SENSOR":
        fields = [
          {
            name: "humidity",
            type: "number (0-100)",
            required: true,
            description: "Percentage humidity.",
          },
          {
            name: "unit",
            type: "string",
            required: false,
            description: "Default: 'percent'.",
          },
          {
            name: "temperature",
            type: "number",
            required: false,
            description: "Associated temperature reading, if any.",
          },
        ];
        examplePayload = { humidity: 70, unit: "percent", temperature: 22.5 };
        break;
      case "MOTION_DETECTOR":
        fields = [
          {
            name: "motion",
            type: "number (0 or 1)",
            required: true,
            description: "1 for motion detected, 0 otherwise.",
          },
          {
            name: "confidence",
            type: "number (0-100)",
            required: false,
            description: "Confidence level of motion detection.",
          },
          {
            name: "duration",
            type: "number",
            required: false,
            description: "Duration of motion in seconds, if applicable.",
          },
        ];
        examplePayload = { motion: 1, confidence: 95, duration: 10 };
        break;
      case "OTHER":
      default:
        fields = [
          {
            name: "metric",
            type: "string",
            required: true,
            description:
              "Name of the metric (e.g., 'pressure', 'light_level').",
          },
          {
            name: "value",
            type: "number",
            required: true,
            description: "The value of the metric.",
          },
          {
            name: "unit",
            type: "string",
            required: false,
            description: "Unit of the metric (e.g., 'hPa', 'lux').",
          },
        ];
        examplePayload = { metric: "pressure", value: 1012.5, unit: "hPa" };
        break;
    }
    fields = [...fields, ...commonOptional];
    examplePayload.timestamp = new Date().toISOString();

    return (
      <div
        className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4"
        onClick={() => setShowDataFormatModal(false)}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6"
          onClick={(e) => e.stopPropagation()} // Prevent click from closing modal
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-100">
              Data Format for {device.type}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowDataFormatModal(false)}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
            Your device is of type: <strong>{device.type}</strong>. Ensure your
            JSON payload matches the structure below when sending data to
            <code className="text-xs bg-slate-100 dark:bg-slate-700 p-1 rounded mx-1">
              /data/{user?.username}/{device.id}
            </code>
            .
          </p>

          <h4 className="font-semibold text-slate-700 dark:text-slate-200 mt-4 mb-2">
            Fields:
          </h4>
          <ul className="space-y-2 mb-4">
            {fields.map((field) => (
              <li
                key={field.name}
                className="text-sm p-2 border-b border-slate-200 dark:border-slate-700"
              >
                <strong className="text-slate-800 dark:text-slate-100">
                  {field.name}
                </strong>
                :{" "}
                <span className="text-slate-600 dark:text-slate-300">
                  {field.type}
                </span>
                {field.required ? (
                  <Badge variant="destructive" className="ml-2 text-xs">
                    Required
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Optional
                  </Badge>
                )}
                {field.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {field.description}
                  </p>
                )}
              </li>
            ))}
          </ul>

          <h4 className="font-semibold text-slate-700 dark:text-slate-200 mt-4 mb-2">
            Example Payload:
          </h4>
          <pre className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-3 rounded-md text-xs overflow-x-auto">
            <code>{JSON.stringify(examplePayload, null, 2)}</code>
          </pre>
          <div className="mt-6 text-right">
            <Button
              onClick={() => setShowDataFormatModal(false)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Close
            </Button>
          </div>
        </motion.div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 dark:from-slate-700 dark:via-slate-800 dark:to-slate-900 text-white p-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              Device created. Let's check connectivity!
            </h2>
            <p className="text-slate-200 text-sm mt-1">
              Device: <span className="font-medium">{device.name}</span> (
              {device.id}) - Type:{" "}
              <span className="font-medium">{device.type}</span>
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-slate-500/50"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(95vh-180px)]">
          {/* API Keys Section (remains the same) */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold flex items-center gap-2 text-lg">
                <Key className="w-5 h-5 text-blue-600" />
                API Authentication
              </h3>
              <Button
                size="sm"
                onClick={() => setShowApiKeyForm(true)}
                disabled={showApiKeyForm}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create API Key
              </Button>
            </div>

            <AnimatePresence>
              {showApiKeyForm && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <Card className="mb-4 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardContent className="p-4 space-y-4">
                      <div>
                        <Label
                          htmlFor="key-name"
                          className="text-sm font-medium"
                        >
                          Key Name
                        </Label>
                        <Input
                          id="key-name"
                          value={newKeyName}
                          onChange={(e) => setNewKeyName(e.target.value)}
                          placeholder="e.g., Production Server, Development Environment"
                          className="mt-1"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={createApiKey}
                          disabled={isCreatingKey}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {isCreatingKey ? (
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <Key className="w-4 h-4 mr-2" />
                          )}
                          Generate Key
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowApiKeyForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>

            {isLoadingKeys ? (
              <Card className="text-center p-6">
                <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin text-blue-600" />
                <p className="text-sm text-muted-foreground">
                  Loading API keys...
                </p>
              </Card>
            ) : apiKeys.length > 0 ? (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b">
                  <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground">
                    <span className="col-span-4">Name</span>
                    <span className="col-span-3">Prefix</span>
                    <span className="col-span-2">Created</span>
                    <span className="col-span-2">Last Used</span>
                    <span className="col-span-1">Actions</span>
                  </div>
                </div>
                <div className="divide-y">
                  {apiKeys.map((apiKey) => (
                    <motion.div
                      key={apiKey.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="px-4 py-3 grid grid-cols-12 gap-4 text-sm items-center hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    >
                      <span className="col-span-4 font-medium">
                        {apiKey.name}
                      </span>
                      <span className="col-span-3 font-mono text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">
                        {apiKey.prefix}...
                      </span>
                      <span className="col-span-2 text-muted-foreground">
                        {new Date(apiKey.createdAt).toLocaleDateString()}
                      </span>
                      <span className="col-span-2 text-muted-foreground">
                        {apiKey.lastUsedAt
                          ? new Date(apiKey.lastUsedAt).toLocaleDateString()
                          : "Never"}
                      </span>
                      <div className="col-span-1 flex gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyApiKey(apiKey.prefix)}
                          className="h-8 w-8 p-0"
                          title="Copy API Key Prefix"
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteApiKey(apiKey.id)}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          title="Delete API Key"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <Card className="text-center p-8 border-dashed border-2">
                <Key className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                <h4 className="font-medium mb-2">No API Keys</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Create an API key to authenticate your device connections
                </p>
                <Button
                  onClick={() => setShowApiKeyForm(true)}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First API Key
                </Button>
              </Card>
            )}
          </div>

          <Separator className="my-8" />

          {/* Protocol Selection (remains the same) */}
          <div className="mb-8">
            <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
              <Globe className="w-5 h-5 text-green-600" />
              Connection Protocol
            </h3>
            <Tabs value={selectedProtocol} onValueChange={setSelectedProtocol}>
              <TabsList className="grid grid-cols-3 w-full h-12">
                {protocols.map((protocol) => {
                  const Icon = protocol.icon;
                  return (
                    <TabsTrigger
                      key={protocol.id}
                      value={protocol.id}
                      className="flex items-center gap-2 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{protocol.name}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
            {currentProtocol && (
              <Card className="mt-3 border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
                <CardContent className="p-3">
                  <p className="text-sm text-muted-foreground">
                    {currentProtocol.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Enhanced IoT IDE Selection (remains the same) */}
          <div className="mb-8">
            <h3 className="font-semibold mb-4 text-lg flex items-center gap-2">
              <Code className="w-5 h-5 text-purple-600" />
              Development Environment
            </h3>
            <p className="text-muted-foreground mb-6 text-sm">
              Choose your preferred IoT development environment for seamless
              device integration
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {iotIDEs.map((ide) => {
                const Icon = ide.icon;
                const isSelected = selectedIDE === ide.id;
                return (
                  <motion.div
                    key={ide.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      "relative cursor-pointer transition-all duration-200",
                      isSelected &&
                        "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-900"
                    )}
                    onClick={() => setSelectedIDE(ide.id)}
                  >
                    <Card
                      className={cn(
                        "h-full border-2 transition-all duration-200",
                        isSelected
                          ? "border-blue-500 shadow-lg"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600",
                        ide.bgColor
                      )}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                "p-2 rounded-lg",
                                isSelected
                                  ? "bg-white dark:bg-slate-800 shadow-sm"
                                  : "bg-white/50 dark:bg-slate-800/50"
                              )}
                            >
                              <Icon className={cn("w-6 h-6", ide.color)} />
                            </div>
                            <div>
                              <CardTitle className="text-base font-semibold">
                                {ide.name}
                              </CardTitle>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs mt-1",
                                  getDifficultyColor(ide.difficulty)
                                )}
                              >
                                {ide.difficulty}
                              </Badge>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(ide.downloadUrl, "_blank");
                            }}
                            title={`Open ${ide.name} website`}
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <p className="text-sm text-muted-foreground mb-3">
                          {ide.description}
                        </p>
                        <div className="space-y-2">
                          <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                            Features
                          </h5>
                          <div className="flex flex-wrap gap-1">
                            {ide.features.map((feature, index) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="text-xs"
                              >
                                {feature}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                      {isSelected && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="absolute top-2 right-2"
                        >
                          <div className="bg-blue-500 text-white rounded-full p-1">
                            <Check className="w-3 h-3" />
                          </div>
                        </motion.div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
            {currentIDE && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card className="border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BookOpen className="w-4 h-4" />
                      Setup Instructions for {currentIDE.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {getInstallationInstructions()}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          window.open(currentIDE.downloadUrl, "_blank")
                        }
                        className="h-8"
                      >
                        <Download className="w-3 h-3 mr-1" />
                        Download {currentIDE.name}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Advanced Settings (remains the same) */}
          <div className="flex items-center justify-between mb-4">
            <Label
              htmlFor="advanced-settings"
              className="text-sm font-medium flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              Advanced Configuration
            </Label>
            <Switch
              id="advanced-settings"
              checked={showAdvanced}
              onCheckedChange={setShowAdvanced}
            />
          </div>
          <AnimatePresence>
            {showAdvanced && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <Card className="mb-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Connection Settings
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="endpoint">Custom Endpoint URL</Label>
                        <Input
                          id="endpoint"
                          value={customEndpoint}
                          onChange={(e) => setCustomEndpoint(e.target.value)}
                          placeholder={API_BASE_URL}
                        />
                      </div>
                      <div>
                        <Label htmlFor="port">Port</Label>
                        <Input
                          id="port"
                          value={customPort}
                          onChange={(e) => setCustomPort(e.target.value)}
                          placeholder={currentProtocol?.port || "e.g. 3001"}
                        />
                      </div>
                    </div>

                    {selectedProtocol === "http" && (
                      <div className="flex items-center justify-between pt-2">
                        <Label
                          htmlFor="ssl"
                          className="flex items-center gap-1"
                        >
                          {" "}
                          <Info size={14} /> Use HTTPS (SSL/TLS)
                        </Label>
                        <Switch
                          id="ssl"
                          checked={useSSL}
                          onCheckedChange={setUseSSL}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Code Example */}
          <Card className="mb-6">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">Integration Code</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => setShowDataFormatModal(true)}
                  >
                    <BookOpen className="w-3 h-3 mr-1.5" /> View Data Format
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {selectedProtocol.toUpperCase()}
                    {useSSL && selectedProtocol === "http" && "S"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {currentIDE?.name}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testConnection}
                    disabled={isConnecting || apiKeys.length === 0}
                    className="h-8"
                  >
                    {isConnecting ? (
                      <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                    ) : (
                      <Play className="w-3 h-3 mr-1" />
                    )}
                    Test Connection
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="bg-slate-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto font-mono max-h-80">
                  <code>{getConnectionCommand()}</code>
                </pre>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyCommand}
                  className="absolute top-2 right-2 h-8 w-8"
                  title="Copy Code"
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
              {apiKeys.length === 0 && (
                <p className="text-xs text-red-500 mt-2">
                  ⚠️ Create an API key first to enable device authentication and
                  accurate code examples.
                </p>
              )}
            </CardContent>
          </Card>
          {showDataFormatModal && renderDataFormatInstructions()}

          {/* Connection Status & Telemetry (remains the same) */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="font-medium">Connection Status</span>
              <Badge
                variant={
                  connectionStatus === "connected" ? "default" : "secondary"
                }
                className={cn(
                  "text-xs",
                  connectionStatus === "connected" &&
                    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                  connectionStatus === "failed" &&
                    "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
                  connectionStatus === "connecting" &&
                    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
                  connectionStatus === "no-data" &&
                    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                )}
              >
                {connectionStatus === "connected" && (
                  <CheckCircle className="w-3 h-3 mr-1" />
                )}
                {connectionStatus === "failed" && (
                  <AlertCircle className="w-3 h-3 mr-1" />
                )}
                {connectionStatus === "connecting" && (
                  <Clock className="w-3 h-3 mr-1 animate-spin" />
                )}
                {connectionStatus === "no-data" && (
                  <WifiOff className="w-3 h-3 mr-1" />
                )}
                {connectionStatus === "idle" && "Inactive"}
                {connectionStatus === "connecting" && "Connecting..."}
                {connectionStatus === "connected" &&
                  "Connected & Receiving Data"}
                {connectionStatus === "no-data" && "Device Found - No Data"}
                {connectionStatus === "failed" && "Connection Failed"}
              </Badge>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-slate-50 dark:bg-slate-800 px-4 py-3 border-b">
                <div className="grid grid-cols-4 gap-4 text-sm font-medium text-muted-foreground">
                  <span>Time</span>
                  <span>Metric</span>
                  <span>Value</span>
                  <span>Unit</span>
                </div>
              </div>
              <div className="min-h-[120px]">
                {telemetryData.length === 0 ? (
                  <div className="flex items-center justify-center h-[120px] text-muted-foreground">
                    <div className="text-center">
                      <Radio className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No telemetry data received yet</p>
                      <p className="text-xs">
                        Click "Test Connection" to check device connectivity
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y max-h-64 overflow-y-auto">
                    {telemetryData.map((data, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="px-4 py-3 grid grid-cols-4 gap-4 text-sm"
                      >
                        <span className="text-muted-foreground text-xs">
                          {new Date(data.timestamp).toLocaleTimeString()}
                        </span>
                        <span className="font-medium">{data.key}</span>
                        <span
                          className={cn(
                            "font-mono",
                            data.key === "data_status" &&
                              data.value === "no data received" &&
                              "text-yellow-600 dark:text-yellow-400",
                            data.key === "connection_test" &&
                              data.value === "device not sending data" &&
                              "text-yellow-600 dark:text-yellow-400"
                          )}
                        >
                          {typeof data.value === "number"
                            ? data.value.toFixed(2) // Show more precision if number
                            : String(data.value)}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {data.unit || "-"}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {connectionStatus === "no-data" && (
              <div className="mt-3 p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                <div className="flex items-start gap-2">
                  <WifiOff className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-yellow-800 dark:text-yellow-300">
                      Device Registered - Awaiting Data
                    </p>
                    <p className="text-yellow-700 dark:text-yellow-400 mt-1">
                      Your device is registered but hasn't sent sensor data yet.
                      Use the code snippet above and ensure your payload matches
                      the format described in "View Data Format Instructions".
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Separator className="my-6" />

          {/* Footer Actions (remains the same) */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Switch
                id="dont-show"
                checked={dontShowAgain}
                onCheckedChange={setDontShowAgain}
              />
              <Label htmlFor="dont-show" className="text-sm">
                Don't show this again
              </Label>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose}>
                Skip & Finish
              </Button>
              <Button
                onClick={handleComplete}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={
                  connectionStatus !== "connected" &&
                  connectionStatus !== "no-data"
                }
                title={
                  connectionStatus === "connected" ||
                  connectionStatus === "no-data"
                    ? "Complete Setup"
                    : "Please test connection first or ensure API key is created"
                }
              >
                <Check className="w-4 h-4 mr-2" />
                Complete Setup
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
