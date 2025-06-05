-- AlterTable
ALTER TABLE "Device" ADD COLUMN     "currentLatitude" DOUBLE PRECISION,
ADD COLUMN     "currentLocation" TEXT,
ADD COLUMN     "currentLongitude" DOUBLE PRECISION,
ADD COLUMN     "ipAddress" TEXT,
ADD COLUMN     "lastKnownLatitude" DOUBLE PRECISION,
ADD COLUMN     "lastKnownLocation" TEXT,
ADD COLUMN     "lastKnownLongitude" DOUBLE PRECISION,
ADD COLUMN     "locationUpdatedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Device_currentLatitude_currentLongitude_idx" ON "Device"("currentLatitude", "currentLongitude");

-- CreateIndex
CREATE INDEX "Device_userId_status_idx" ON "Device"("userId", "status");

-- CreateIndex
CREATE INDEX "SensorData_deviceId_timestamp_idx" ON "SensorData"("deviceId", "timestamp");
