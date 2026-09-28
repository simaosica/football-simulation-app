/*
  Warnings:

  - Changed the type of `profile` on the `Player` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "Player" DROP COLUMN "profile",
ADD COLUMN     "profile" JSONB NOT NULL;
