-- CreateTable
CREATE TABLE "TaskAssignee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    CONSTRAINT "TaskAssignee_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskAssignee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TaskAssignee_taskId_userId_key" ON "TaskAssignee"("taskId", "userId");

-- MigrateData: move existing single assigneeId rows into TaskAssignee
INSERT INTO "TaskAssignee" ("id", "taskId", "userId")
SELECT lower(hex(randomblob(16))), "id", "assigneeId"
FROM "Task"
WHERE "assigneeId" IS NOT NULL;

-- RedefineTables: drop assigneeId from Task (SQLite requires full table rebuild)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Task" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "dueAt" DATETIME,
    "position" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "recurrenceRule" TEXT,
    "recurrenceEndAt" DATETIME,
    "parentId" TEXT,
    "creatorId" TEXT NOT NULL,
    "clientId" TEXT,
    CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Task_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Task" ("id", "title", "description", "status", "priority", "dueAt", "position", "createdAt", "updatedAt", "recurrenceRule", "recurrenceEndAt", "parentId", "creatorId", "clientId")
SELECT "id", "title", "description", "status", "priority", "dueAt", "position", "createdAt", "updatedAt", "recurrenceRule", "recurrenceEndAt", "parentId", "creatorId", "clientId"
FROM "Task";

DROP TABLE "Task";
ALTER TABLE "new_Task" RENAME TO "Task";

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
