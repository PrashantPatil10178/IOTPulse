/*
  Warnings:

  - You are about to drop the column `metric` on the `SensorData` table. All the data in the column will be lost.
  - You are about to drop the column `unit` on the `SensorData` table. All the data in the column will be lost.
  - You are about to drop the column `value` on the `SensorData` table. All the data in the column will be lost.
  - Added the required column `data` to the `SensorData` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SensorData" DROP COLUMN "metric",
DROP COLUMN "unit",
DROP COLUMN "value",
ADD COLUMN     "data" JSONB NOT NULL;
