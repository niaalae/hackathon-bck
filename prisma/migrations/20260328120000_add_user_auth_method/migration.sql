-- CreateEnum
CREATE TYPE "AuthMethod" AS ENUM ('PASSWORD', 'GOOGLE');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "authMethod" "AuthMethod" NOT NULL DEFAULT 'PASSWORD';
ALTER TABLE "User" ADD COLUMN "authProviderId" TEXT;
ALTER TABLE "User" ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "User_authProviderId_key" ON "User"("authProviderId");
