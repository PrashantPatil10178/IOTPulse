import express from "express";
import { alertsController } from "../controllers/alerts.controller.js";
import { authenticateJWT } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Alerts
 *   description: Alert management
 */

/**
 * @swagger
 * /api/alerts:
 *   get:
 *     summary: Get all alerts with filtering and pagination
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [OPEN, ACKNOWLEDGED, RESOLVED]
 *         description: Filter by alert status
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *         description: Filter by alert severity
 *       - in: query
 *         name: deviceId
 *         schema:
 *           type: string
 *         description: Filter by device ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *     responses:
 *       200:
 *         description: List of alerts with pagination info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alerts:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Alert'
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     total:
 *                       type: integer
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *       500:
 *         description: Server error
 */
router.get("/", authenticateJWT, alertsController.getAllAlerts);

/**
 * @swagger
 * /api/alerts/{alertId}:
 *   get:
 *     summary: Get a specific alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the alert to retrieve
 *     responses:
 *       200:
 *         description: Alert details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AlertWithDevice'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Server error
 */
router.get("/:alertId", authenticateJWT, alertsController.getAlert);

/**
 * @swagger
 * /api/alerts/{alertId}/acknowledge:
 *   post:
 *     summary: Acknowledge an alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the alert to acknowledge
 *     responses:
 *       200:
 *         description: Updated alert
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Alert'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Server error
 */
router.post(
  "/:alertId/acknowledge",
  authenticateJWT,
  alertsController.acknowledgeAlert
);

/**
 * @swagger
 * /api/alerts/{alertId}/resolve:
 *   post:
 *     summary: Resolve an alert
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the alert to resolve
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               resolutionNotes:
 *                 type: string
 *                 description: Notes about how the alert was resolved
 *     responses:
 *       200:
 *         description: Updated alert
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Alert'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Alert not found
 *       500:
 *         description: Server error
 */
router.post(
  "/:alertId/resolve",
  authenticateJWT,
  alertsController.resolveAlert
);

/**
 * @swagger
 * /api/alerts:
 *   post:
 *     summary: Create an alert (for testing or manual creation)
 *     tags: [Alerts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - deviceId
 *               - title
 *               - message
 *               - severity
 *             properties:
 *               deviceId:
 *                 type: string
 *               title:
 *                 type: string
 *               message:
 *                 type: string
 *               severity:
 *                 type: string
 *                 enum: [LOW, MEDIUM, HIGH, CRITICAL]
 *     responses:
 *       201:
 *         description: Created alert
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Alert'
 *       403:
 *         description: Access denied
 *       404:
 *         description: Device not found
 *       500:
 *         description: Server error
 */
router.post("/", authenticateJWT, alertsController.createAlert);

export default router;
