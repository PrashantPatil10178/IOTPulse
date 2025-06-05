import { Router } from "express";
import { iotController } from "../controllers/iot.controller.js";

const iotRouter = Router();

/**
 * @swagger
 * tags:
 *   name: IoT
 *   description: IoT sensor/device data routes
 */

/**
 * @swagger
 * /iot/{username}/{deviceId}:
 *   post:
 *     summary: Submit new sensor data for a device
 *     tags: [IoT]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: User's username
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device unique ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - $ref: '#/components/schemas/TemperatureSensorData'
 *               - $ref: '#/components/schemas/HumiditySensorData'
 *               - $ref: '#/components/schemas/MotionDetectorData'
 *               - $ref: '#/components/schemas/SmartLightData'
 *               - $ref: '#/components/schemas/SmartPlugData'
 *               - $ref: '#/components/schemas/CameraData'
 *               - $ref: '#/components/schemas/EnergyMeterData'
 *               - $ref: '#/components/schemas/WaterMeterData'
 *               - $ref: '#/components/schemas/AirQualitySensorData'
 *               - $ref: '#/components/schemas/GenericSensorData'
 *     responses:
 *       201:
 *         description: Sensor data processed and stored successfully
 *       400:
 *         description: Invalid or malformed request
 *       404:
 *         description: User or device not found
 *       500:
 *         description: Internal server error
 */
iotRouter.post("/:username/:deviceId", iotController.postSensorData);

/**
 * @swagger
 * /iot/{username}/{deviceId}/latest:
 *   get:
 *     summary: Get latest sensor data for a device
 *     tags: [IoT]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: User's username
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device unique ID
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Number of recent data entries to return (default 10)
 *     responses:
 *       200:
 *         description: Latest sensor data for the device
 *       404:
 *         description: No sensor data found
 *       500:
 *         description: Internal server error
 */
iotRouter.get("/:username/:deviceId/latest", iotController.getLatestSensorData);

/**
 * @swagger
 * /iot/{username}/{deviceId}/locations:
 *   get:
 *     summary: Get current and previous locations of a device
 *     tags: [IoT]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: User's username
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device unique ID
 *     responses:
 *       200:
 *         description: Location information retrieved successfully
 *       404:
 *         description: Device or user not found, or no location data
 *       500:
 *         description: Internal server error
 */
iotRouter.get(
  "/:username/:deviceId/locations",
  iotController.getDeviceLocations
);

/**
 * @swagger
 * /iot/{username}/{deviceId}/nearby:
 *   get:
 *     summary: Find nearby devices of the same user
 *     tags: [IoT]
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *         description: User's username
 *       - in: path
 *         name: deviceId
 *         required: true
 *         schema:
 *           type: string
 *         description: Device unique ID
 *       - in: query
 *         name: radius
 *         required: false
 *         schema:
 *           type: number
 *           default: 1.0
 *         description: Search radius in kilometers (default 1.0)
 *     responses:
 *       200:
 *         description: List of nearby devices
 *       404:
 *         description: No nearby devices found
 *       500:
 *         description: Internal server error
 */
iotRouter.get("/:username/:deviceId/nearby", iotController.getNearbyDevices);

export { iotRouter };

/**
 * @swagger
 * components:
 *   schemas:
 *     TemperatureSensorData:
 *       type: object
 *       required: [temperature, unit]
 *       properties:
 *         timestamp:
 *           type: string
 *           format: date-time
 *         temperature:
 *           type: number
 *           description: Temperature value
 *         unit:
 *           type: string
 *           enum: [celsius, fahrenheit, kelvin]
 *         humidity:
 *           type: number
 *           description: Optional humidity percentage
 *         pressure:
 *           type: number
 *           description: Optional pressure value
 *     HumiditySensorData:
 *       type: object
 *       required: [humidity, unit]
 *       properties:
 *         timestamp:
 *           type: string
 *           format: date-time
 *         humidity:
 *           type: number
 *         unit:
 *           type: string
 *         temperature:
 *           type: number
 *         dewPoint:
 *           type: number
 *     MotionDetectorData:
 *       type: object
 *       required: [motion]
 *       properties:
 *         timestamp:
 *           type: string
 *           format: date-time
 *         motion:
 *           oneOf:
 *             - type: boolean
 *             - type: number
 *         confidence:
 *           type: number
 *         duration:
 *           type: number
 *         sensitivity:
 *           type: number
 *         zone:
 *           type: string
 *     SmartLightData:
 *       type: object
 *       required: [status]
 *       properties:
 *         timestamp:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [on, off]
 *         brightness:
 *           type: number
 *         color:
 *           type: object
 *           properties:
 *             r: { type: number }
 *             g: { type: number }
 *             b: { type: number }
 *         colorTemperature:
 *           type: number
 *         powerConsumption:
 *           type: number
 *         dimLevel:
 *           type: number
 *     SmartPlugData:
 *       type: object
 *       required: [status, powerConsumption]
 *       properties:
 *         timestamp:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [on, off]
 *         powerConsumption:
 *           type: number
 *         voltage:
 *           type: number
 *         current:
 *           type: number
 *         totalEnergyUsed:
 *           type: number
 *         schedule:
 *           type: object
 *           properties:
 *             enabled: { type: boolean }
 *             onTime: { type: string }
 *             offTime: { type: string }
 *     CameraData:
 *       type: object
 *       required: [status]
 *       properties:
 *         timestamp:
 *           type: string
 *           format: date-time
 *         status:
 *           type: string
 *           enum: [recording, idle, offline]
 *         resolution:
 *           type: string
 *         fps:
 *           type: number
 *         motionDetected:
 *           type: boolean
 *         nightVision:
 *           type: boolean
 *         storageUsed:
 *           type: number
 *         batteryLevel:
 *           type: number
 *         recordingDuration:
 *           type: number
 *     EnergyMeterData:
 *       type: object
 *       required: [powerUsage, totalEnergy, voltage, current]
 *       properties:
 *         timestamp:
 *           type: string
 *           format: date-time
 *         powerUsage:
 *           type: number
 *         totalEnergy:
 *           type: number
 *         voltage:
 *           type: number
 *         current:
 *           type: number
 *         frequency:
 *           type: number
 *         powerFactor:
 *           type: number
 *         cost:
 *           type: number
 *         peakDemand:
 *           type: number
 *     WaterMeterData:
 *       type: object
 *       required: [flowRate, totalVolume]
 *       properties:
 *         timestamp:
 *           type: string
 *           format: date-time
 *         flowRate:
 *           type: number
 *         totalVolume:
 *           type: number
 *         pressure:
 *           type: number
 *         temperature:
 *           type: number
 *         quality:
 *           type: object
 *           properties:
 *             ph: { type: number }
 *             turbidity: { type: number }
 *             tds: { type: number }
 *         leakDetected:
 *           type: boolean
 *     AirQualitySensorData:
 *       type: object
 *       required: [pm25, pm10, co2]
 *       properties:
 *         timestamp:
 *           type: string
 *           format: date-time
 *         pm25:
 *           type: number
 *         pm10:
 *           type: number
 *         co2:
 *           type: number
 *         humidity:
 *           type: number
 *         temperature:
 *           type: number
 *         voc:
 *           type: number
 *         aqi:
 *           type: number
 *         co:
 *           type: number
 *         no2:
 *           type: number
 *         o3:
 *           type: number
 *     GenericSensorData:
 *       type: object
 *       required: [sensorType, primaryMetric]
 *       properties:
 *         timestamp:
 *           type: string
 *           format: date-time
 *         sensorType:
 *           type: string
 *         primaryMetric:
 *           type: object
 *           required: [name, value, unit]
 *           properties:
 *             name: { type: string }
 *             value: { type: number }
 *             unit: { type: string }
 *             min: { type: number }
 *             max: { type: number }
 *         secondaryMetrics:
 *           type: array
 *           items:
 *             type: object
 *             required: [name, value, unit]
 *             properties:
 *               name: { type: string }
 *               value: { type: number }
 *               unit: { type: string }
 *               min: { type: number }
 *               max: { type: number }
 *         status:
 *           type: string
 *           enum: [active, inactive, error, calibrating]
 *         batteryLevel:
 *           type: number
 *         signalStrength:
 *           type: number
 *         metadata:
 *           type: object
 *           properties:
 *             location: { type: string }
 *             notes: { type: string }
 *             calibrationDate: { type: string }
 *             firmware: { type: string }
 */
