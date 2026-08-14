-- CreateTable
CREATE TABLE "WeeklyXp" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "guestId" TEXT,
    "name" TEXT NOT NULL,
    "week" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WeeklyXp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyXp_week_userId_key" ON "WeeklyXp"("week", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyXp_week_guestId_key" ON "WeeklyXp"("week", "guestId");

-- CreateIndex
CREATE INDEX "WeeklyXp_week_xp_idx" ON "WeeklyXp"("week", "xp");

-- CreateIndex
CREATE INDEX "WeeklyXp_userId_idx" ON "WeeklyXp"("userId");

-- AddForeignKey
ALTER TABLE "WeeklyXp" ADD CONSTRAINT "WeeklyXp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
