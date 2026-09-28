-- CreateTable
CREATE TABLE "PollResult" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "closesAt" TIMESTAMP(3) NOT NULL,
    "total" INTEGER NOT NULL DEFAULT 0,
    "winnerId" TEXT,
    "issueUrl" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PollResult_pkey" PRIMARY KEY ("id")
);

-- The close sweep claims a poll by INSERTing this row BEFORE it calls GitHub,
-- so the unique index is what stops two concurrent readers from filing the
-- same results twice. One row per poll, forever: it is the record that a poll
-- was reported.
CREATE UNIQUE INDEX "PollResult_pollId_key" ON "PollResult"("pollId");

-- Supports reading back the results link for the polls a client is rendering.
CREATE INDEX "PollResult_issueUrl_idx" ON "PollResult"("issueUrl");
