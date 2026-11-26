-- CreateTable
CREATE TABLE "pastes" (
    "id" VARCHAR(16) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "max_views" INTEGER,
    "views" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "pastes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pastes_expires_at_idx" ON "pastes"("expires_at");
