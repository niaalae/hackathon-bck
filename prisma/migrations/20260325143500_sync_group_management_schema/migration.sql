DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'GroupMembershipRole'
  ) THEN
    CREATE TYPE "GroupMembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');
  END IF;
END $$;

ALTER TYPE "GroupMembershipStatus" ADD VALUE IF NOT EXISTS 'REJECTED';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typnamespace = 'public'::regnamespace AND typname = 'NotificationType'
  ) THEN
    CREATE TYPE "NotificationType" AS ENUM (
      'GROUP_JOIN_REQUEST',
      'GROUP_REQUEST_APPROVED',
      'GROUP_REQUEST_REJECTED',
      'GROUP_REQUEST_RESOLVED',
      'GROUP_ROLE_CHANGED',
      'GROUP_MEMBER_REMOVED',
      'GROUP_UPDATED'
    );
  END IF;
END $$;

ALTER TABLE "Group"
  ADD COLUMN IF NOT EXISTS "ownerUserId" TEXT,
  ADD COLUMN IF NOT EXISTS "title" TEXT,
  ADD COLUMN IF NOT EXISTS "description" TEXT,
  ADD COLUMN IF NOT EXISTS "coverImage" TEXT;

ALTER TABLE "GroupMembership"
  ADD COLUMN IF NOT EXISTS "role" "GroupMembershipRole" NOT NULL DEFAULT 'MEMBER',
  ADD COLUMN IF NOT EXISTS "respondedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewedByUserId" TEXT;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "groupId" TEXT,
  "membershipUserId" TEXT,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "data" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

UPDATE "Group"
SET
  "title" = CASE id
    WHEN '1c2b0209-01c6-4c09-84f5-863abb80ce06' THEN 'Marrakech Spring Escape'
    WHEN '8b83e924-4171-450d-8bae-a560fc8b9ff5' THEN 'Marrakech Rooftops and Souks'
    WHEN 'ab765fb1-7c4c-4a8d-8da7-2fef8aa6bf28' THEN 'Fez Deep Culture Week'
    WHEN '6ea0f2f9-f319-44d4-904c-37c621c64fa5' THEN 'Tangier Coast Circle'
    WHEN 'a693aa30-9ab2-41b6-bbad-255b096d0a57' THEN 'Tangier Autumn Adventure'
    ELSE COALESCE("title", 'Travel Group ' || LEFT(id, 8))
  END,
  "description" = CASE id
    WHEN '1c2b0209-01c6-4c09-84f5-863abb80ce06' THEN 'Shared trip for travelers who want culture, food, and easy planning together.'
    WHEN '8b83e924-4171-450d-8bae-a560fc8b9ff5' THEN 'Small group focused on city energy, rooftop dinners, and old medina spots.'
    WHEN 'ab765fb1-7c4c-4a8d-8da7-2fef8aa6bf28' THEN 'Travelers exploring Fez with a slower pace and shared planning.'
    WHEN '6ea0f2f9-f319-44d4-904c-37c621c64fa5' THEN 'Coastal stays, photography, and laid-back travel with shared decision making.'
    WHEN 'a693aa30-9ab2-41b6-bbad-255b096d0a57' THEN 'Open group for travelers planning autumn days together in Tangier.'
    ELSE "description"
  END,
  "coverImage" = CASE id
    WHEN '1c2b0209-01c6-4c09-84f5-863abb80ce06' THEN 'https://images.unsplash.com/photo-1597212720350-95c43c6a1a79?w=1200'
    WHEN '8b83e924-4171-450d-8bae-a560fc8b9ff5' THEN 'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?w=1200'
    WHEN 'ab765fb1-7c4c-4a8d-8da7-2fef8aa6bf28' THEN 'https://images.unsplash.com/photo-1548013146-72479768bada?w=1200'
    WHEN '6ea0f2f9-f319-44d4-904c-37c621c64fa5' THEN 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1200'
    WHEN 'a693aa30-9ab2-41b6-bbad-255b096d0a57' THEN 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200'
    ELSE "coverImage"
  END,
  "ownerUserId" = CASE id
    WHEN '1c2b0209-01c6-4c09-84f5-863abb80ce06' THEN 'd1d906aa-c067-47c1-ac30-b54e381f32f1'
    WHEN '8b83e924-4171-450d-8bae-a560fc8b9ff5' THEN 'd1d906aa-c067-47c1-ac30-b54e381f32f1'
    WHEN 'ab765fb1-7c4c-4a8d-8da7-2fef8aa6bf28' THEN '1feaca58-3c4a-451d-98f8-27a9b401999a'
    WHEN '6ea0f2f9-f319-44d4-904c-37c621c64fa5' THEN 'd1d906aa-c067-47c1-ac30-b54e381f32f1'
    WHEN 'a693aa30-9ab2-41b6-bbad-255b096d0a57' THEN 'd1d906aa-c067-47c1-ac30-b54e381f32f1'
    ELSE COALESCE("ownerUserId", 'd1d906aa-c067-47c1-ac30-b54e381f32f1')
  END
WHERE "title" IS NULL OR "ownerUserId" IS NULL OR "description" IS NULL OR "coverImage" IS NULL;

UPDATE "GroupMembership" gm
SET
  "role" = CASE
    WHEN gm."userId" = g."ownerUserId" THEN 'OWNER'::"GroupMembershipRole"
    ELSE COALESCE(gm."role", 'MEMBER'::"GroupMembershipRole")
  END,
  "respondedAt" = COALESCE(gm."respondedAt", gm."requestedAt"),
  "reviewedByUserId" = COALESCE(gm."reviewedByUserId", g."ownerUserId")
FROM "Group" g
WHERE g.id = gm."groupId";

INSERT INTO "GroupMembership" ("groupId", "userId", "status", "role", "requestedAt", "respondedAt", "reviewedByUserId", "updatedAt")
SELECT g.id, g."ownerUserId", 'MEMBER'::"GroupMembershipStatus", 'OWNER'::"GroupMembershipRole", g."createdAt", g."createdAt", g."ownerUserId", g."updatedAt"
FROM "Group" g
WHERE NOT EXISTS (
  SELECT 1 FROM "GroupMembership" gm WHERE gm."groupId" = g.id AND gm."userId" = g."ownerUserId"
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Group_ownerUserId_fkey'
  ) THEN
    ALTER TABLE "Group"
      ADD CONSTRAINT "Group_ownerUserId_fkey"
      FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'GroupMembership_reviewedByUserId_fkey'
  ) THEN
    ALTER TABLE "GroupMembership"
      ADD CONSTRAINT "GroupMembership_reviewedByUserId_fkey"
      FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notification_userId_fkey'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notification_actorUserId_fkey'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_actorUserId_fkey"
      FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Notification_groupId_fkey'
  ) THEN
    ALTER TABLE "Notification"
      ADD CONSTRAINT "Notification_groupId_fkey"
      FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "Group_ownerUserId_idx" ON "Group"("ownerUserId");
CREATE INDEX IF NOT EXISTS "GroupMembership_reviewedByUserId_idx" ON "GroupMembership"("reviewedByUserId");
CREATE INDEX IF NOT EXISTS "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Notification_groupId_idx" ON "Notification"("groupId");
CREATE INDEX IF NOT EXISTS "Notification_membershipUserId_idx" ON "Notification"("membershipUserId");

ALTER TABLE "Group" ALTER COLUMN "title" SET NOT NULL;
ALTER TABLE "Group" ALTER COLUMN "ownerUserId" SET NOT NULL;
