/*
  Warnings:

  - You are about to drop the `StartingXI` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "StartingXI" DROP CONSTRAINT "StartingXI_userId_fkey";

-- DropTable
DROP TABLE "StartingXI";
