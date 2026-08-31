-- CreateTable
CREATE TABLE "WeeklyFirst" (
    "id" TEXT NOT NULL,
    "week" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "settledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyFirst_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyFirst_week_key" ON "WeeklyFirst"("week");

-- CreateIndex
CREATE INDEX "WeeklyFirst_userId_idx" ON "WeeklyFirst"("userId");

-- AddForeignKey
ALTER TABLE "WeeklyFirst" ADD CONSTRAINT "WeeklyFirst_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
