-- AlterTable: drop JSON content, add Yjs binary state
ALTER TABLE "Document" DROP COLUMN "content";
ALTER TABLE "Document" ADD COLUMN "yState" BYTEA;
