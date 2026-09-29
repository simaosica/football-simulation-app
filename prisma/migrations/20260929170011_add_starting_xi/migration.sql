-- CreateTable
CREATE TABLE "StartingXI" (
    "id" TEXT NOT NULL,
    "formation" TEXT NOT NULL,
    "players" JSONB NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StartingXI_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StartingXI_userId_key" ON "StartingXI"("userId");

-- AddForeignKey
ALTER TABLE "StartingXI" ADD CONSTRAINT "StartingXI_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
