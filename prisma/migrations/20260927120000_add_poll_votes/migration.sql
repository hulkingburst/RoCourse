-- CreateTable
CREATE TABLE "PollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "voterKey" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PollVote_pkey" PRIMARY KEY ("id")
);

-- One vote per voter per poll. The upsert in src/lib/poll-votes.ts moves an
-- existing vote to a different option, so this is the guard that keeps a
-- re-cast a correction rather than a second vote.
CREATE UNIQUE INDEX "PollVote_pollId_voterKey_key" ON "PollVote"("pollId", "voterKey");

-- Supports the per-poll tally read on every poll open.
CREATE INDEX "PollVote_pollId_idx" ON "PollVote"("pollId");
