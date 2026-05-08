-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('CREATE', 'RENAME', 'EDIT_BATCH', 'RESTORE', 'SHARE');

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "type" "ActivityType" NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Activity_documentId_createdAt_idx" ON "Activity"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "Activity_documentId_actorId_type_createdAt_idx" ON "Activity"("documentId", "actorId", "type", "createdAt");

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;
