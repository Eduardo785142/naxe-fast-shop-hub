-- Initial NAXE LIVE sandbox schema. Money is integer cents.
CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "alias" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'BUYER',
  "enabled" BOOLEAN NOT NULL DEFAULT false,
  "termsAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Session" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Address" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "postalCode" TEXT NOT NULL,
  "street" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "state" TEXT NOT NULL,
  CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentMethodReference" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'SANDBOX',
  "reference" TEXT NOT NULL,
  "scenario" TEXT NOT NULL DEFAULT 'APPROVED',
  CONSTRAINT "PaymentMethodReference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Seller" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "verified" BOOLEAN NOT NULL DEFAULT false,
  CONSTRAINT "Seller_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Follow" (
  "userId" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  CONSTRAINT "Follow_pkey" PRIMARY KEY ("userId", "sellerId")
);

CREATE TABLE "Product" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "artwork" TEXT NOT NULL,
  "stock" INTEGER NOT NULL DEFAULT 1,
  "weight" INTEGER NOT NULL DEFAULT 500,
  "height" INTEGER NOT NULL DEFAULT 10,
  "width" INTEGER NOT NULL DEFAULT 15,
  "length" INTEGER NOT NULL DEFAULT 20,
  "originPostalCode" TEXT NOT NULL DEFAULT '01001000',
  CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LiveStream" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "scheduledAt" TIMESTAMP(3),
  "demonstration" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "LiveStream_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuctionLot" (
  "id" TEXT NOT NULL,
  "streamId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL DEFAULT 'READY',
  "startCents" INTEGER NOT NULL DEFAULT 0,
  "incrementCents" INTEGER NOT NULL DEFAULT 100,
  "bidMode" TEXT NOT NULL DEFAULT 'FIXED',
  "durationSeconds" INTEGER NOT NULL DEFAULT 30,
  "extensionSeconds" INTEGER NOT NULL DEFAULT 10,
  "endsAt" TIMESTAMP(3),
  "currentCents" INTEGER,
  "leaderId" TEXT,
  "version" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "AuctionLot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Bid" (
  "id" TEXT NOT NULL,
  "attemptId" TEXT NOT NULL,
  "lotId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Bid_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuctionEvent" (
  "id" TEXT NOT NULL,
  "lotId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "actorId" TEXT,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuctionEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuctionResult" (
  "id" TEXT NOT NULL,
  "lotId" TEXT NOT NULL,
  "winnerId" TEXT,
  "amountCents" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuctionResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "lotId" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "amountCents" INTEGER NOT NULL,
  "shippingCents" INTEGER NOT NULL,
  "totalCents" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PAID_SANDBOX',
  "shippingAddress" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'SANDBOX',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ChatMessage" (
  "id" TEXT NOT NULL,
  "streamId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "hidden" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "actorId" TEXT,
  "action" TEXT NOT NULL,
  "resourceId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User" ("email");
CREATE UNIQUE INDEX "User_alias_key" ON "User" ("alias");
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Address" ADD CONSTRAINT "Address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentMethodReference" ADD CONSTRAINT "PaymentMethodReference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Seller_userId_key" ON "Seller" ("userId");
CREATE UNIQUE INDEX "Seller_slug_key" ON "Seller" ("slug");
ALTER TABLE "Seller" ADD CONSTRAINT "Seller_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Follow" ADD CONSTRAINT "Follow_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "LiveStream" ADD CONSTRAINT "LiveStream_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "Seller" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuctionLot" ADD CONSTRAINT "AuctionLot_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "LiveStream" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuctionLot" ADD CONSTRAINT "AuctionLot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Bid_attemptId_key" ON "Bid" ("attemptId");
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "AuctionLot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Bid" ADD CONSTRAINT "Bid_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuctionEvent" ADD CONSTRAINT "AuctionEvent_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "AuctionLot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "AuctionResult_lotId_key" ON "AuctionResult" ("lotId");
ALTER TABLE "AuctionResult" ADD CONSTRAINT "AuctionResult_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "AuctionLot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE UNIQUE INDEX "Order_lotId_key" ON "Order" ("lotId");
ALTER TABLE "Order" ADD CONSTRAINT "Order_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "AuctionLot" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Order" ADD CONSTRAINT "Order_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_streamId_fkey" FOREIGN KEY ("streamId") REFERENCES "LiveStream" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Bid_lotId_createdAt_idx" ON "Bid" ("lotId", "createdAt");
CREATE INDEX "AuctionLot_status_endsAt_idx" ON "AuctionLot" ("status", "endsAt");
