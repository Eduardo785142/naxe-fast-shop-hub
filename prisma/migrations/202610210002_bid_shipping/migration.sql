-- Preserve the exact shipping amount accepted with each new bid.
ALTER TABLE "Bid" ADD COLUMN "shippingCents" INTEGER;
