-- Explicit per-lot confirmation order; transaction start timestamps are not an ordering authority.
ALTER TABLE "Bid" ADD COLUMN "sequence" INTEGER;
WITH numbered AS (
 SELECT id, row_number() OVER (PARTITION BY "lotId" ORDER BY "createdAt",id)::INTEGER AS n FROM "Bid"
) UPDATE "Bid" SET "sequence"=numbered.n FROM numbered WHERE "Bid".id=numbered.id;
ALTER TABLE "Bid" ALTER COLUMN "sequence" SET NOT NULL;
CREATE UNIQUE INDEX "Bid_lotId_sequence_key" ON "Bid" ("lotId","sequence");
