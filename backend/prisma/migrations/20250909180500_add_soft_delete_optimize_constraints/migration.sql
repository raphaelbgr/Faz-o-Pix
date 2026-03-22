-- AddSoftDeleteAndOptimizeConstraints
-- This migration adds soft delete support and optimizes foreign key constraints for easier deletion

-- Add soft delete fields to participants table
ALTER TABLE participants ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE participants ADD COLUMN deleted_at TIMESTAMP;

-- Add soft delete fields to bill_members table
ALTER TABLE bill_members ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bill_members ADD COLUMN deleted_at TIMESTAMP;

-- Add indexes for soft delete queries
CREATE INDEX "participants_is_deleted_idx" ON "participants"("is_deleted");
CREATE INDEX "bill_members_is_deleted_idx" ON "bill_members"("is_deleted");

-- Drop and recreate foreign key constraints to remove CASCADE behavior on participant references
-- This allows for easier deletion without cascade effects

-- Drop existing foreign key constraints that have cascade behavior
ALTER TABLE "participant_identifiers" DROP CONSTRAINT IF EXISTS "participant_identifiers_participant_id_fkey";
ALTER TABLE "users_participants_link" DROP CONSTRAINT IF EXISTS "users_participants_link_participant_id_fkey";
ALTER TABLE "users_participants_link" DROP CONSTRAINT IF EXISTS "users_participants_link_user_id_fkey";

-- Recreate constraints without CASCADE behavior
ALTER TABLE "participant_identifiers" 
  ADD CONSTRAINT "participant_identifiers_participant_id_fkey" 
  FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "users_participants_link" 
  ADD CONSTRAINT "users_participants_link_participant_id_fkey" 
  FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "users_participants_link" 
  ADD CONSTRAINT "users_participants_link_user_id_fkey" 
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;