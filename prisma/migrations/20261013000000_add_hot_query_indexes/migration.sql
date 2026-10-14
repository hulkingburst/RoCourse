-- An identity issuance now asks whether a guest id already has board rows
-- (src/app/api/guest-xp/route.ts), which is a lookup on "guestId" alone — the
-- (week, guestId) unique index cannot serve it, because its leading column is
-- the week.
CREATE INDEX "WeeklyXp_guestId_idx" ON "WeeklyXp"("guestId");

-- Completion lists are read per user in date order (the certificate page and
-- the public profile); the (userId, courseId) unique index can filter by user
-- but leaves the sort to be done in memory.
CREATE INDEX "CourseCompletion_userId_completedAt_idx" ON "CourseCompletion"("userId", "completedAt");
