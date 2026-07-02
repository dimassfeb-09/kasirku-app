-- AlterTable: Add password column with a temporary default
ALTER TABLE "users" ADD COLUMN "password" TEXT NOT NULL DEFAULT '';

-- Update existing rows with a hashed default password
UPDATE "users" SET "password" = '$2b$12$LJ3m4ys3Lk0TSwHjmz0VOeUtFdXrECJbMxnJYy7qJqJqJqJqJqJqJ';

-- Remove the default (new rows must provide a password)
ALTER TABLE "users" ALTER COLUMN "password" DROP DEFAULT;
