-- CreateEnum
CREATE TYPE "Segment" AS ENUM ('SMB', 'MID', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "Region" AS ENUM ('NA', 'EU', 'LATAM', 'APAC');

-- CreateEnum
CREATE TYPE "AcquisitionChannel" AS ENUM ('ORGANIC', 'PAID_SEARCH', 'PARTNER', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('ACTIVE', 'CANCELED');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('PAID', 'FAILED', 'VOID');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CARD', 'ACH', 'WIRE');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "CustomerEventType" AS ENUM ('SIGNUP', 'UPGRADE', 'DOWNGRADE', 'CANCEL', 'REACTIVATION');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "externalCustomerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "segment" "Segment" NOT NULL,
    "region" "Region" NOT NULL,
    "acquisitionChannel" "AcquisitionChannel" NOT NULL,
    "baseSeatCount" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "planCode" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "baseMrr" DECIMAL(12,2) NOT NULL,
    "perSeatMrr" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "externalSubId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionMonthlySnapshot" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "snapshotMonth" TIMESTAMP(3) NOT NULL,
    "seats" INTEGER NOT NULL,
    "mrr" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "SubscriptionMonthlySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL,
    "externalInvoiceId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "invoiceMonth" TIMESTAMP(3) NOT NULL,
    "amountSubtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL,
    "amountTotal" DECIMAL(12,2) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "status" "InvoiceStatus" NOT NULL,

    CONSTRAINT "Invoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "externalTxnId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "ts" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "paymentMethod" "PaymentMethod" NOT NULL,
    "status" "TransactionStatus" NOT NULL,
    "merchantFeeRevenue" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostDailyLedger" (
    "id" TEXT NOT NULL,
    "externalCostId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "processingFees" DECIMAL(14,4) NOT NULL,
    "infraCost" DECIMAL(14,4) NOT NULL,
    "fraudToolCost" DECIMAL(14,4) NOT NULL,
    "chargebackLoss" DECIMAL(14,4) NOT NULL,

    CONSTRAINT "CostDailyLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerEvent" (
    "id" TEXT NOT NULL,
    "externalEventId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "eventTs" TIMESTAMP(3) NOT NULL,
    "eventType" "CustomerEventType" NOT NULL,

    CONSTRAINT "CustomerEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_externalCustomerId_key" ON "Customer"("externalCustomerId");

-- CreateIndex
CREATE INDEX "Customer_segment_idx" ON "Customer"("segment");

-- CreateIndex
CREATE INDEX "Customer_region_idx" ON "Customer"("region");

-- CreateIndex
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_planCode_key" ON "Plan"("planCode");

-- CreateIndex
CREATE INDEX "Plan_planCode_idx" ON "Plan"("planCode");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_externalSubId_key" ON "Subscription"("externalSubId");

-- CreateIndex
CREATE INDEX "Subscription_customerId_idx" ON "Subscription"("customerId");

-- CreateIndex
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");

-- CreateIndex
CREATE INDEX "Subscription_startDate_idx" ON "Subscription"("startDate");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "SubscriptionMonthlySnapshot_customerId_snapshotMonth_idx" ON "SubscriptionMonthlySnapshot"("customerId", "snapshotMonth");

-- CreateIndex
CREATE INDEX "SubscriptionMonthlySnapshot_snapshotMonth_idx" ON "SubscriptionMonthlySnapshot"("snapshotMonth");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionMonthlySnapshot_subscriptionId_snapshotMonth_key" ON "SubscriptionMonthlySnapshot"("subscriptionId", "snapshotMonth");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_externalInvoiceId_key" ON "Invoice"("externalInvoiceId");

-- CreateIndex
CREATE INDEX "Invoice_customerId_invoiceMonth_idx" ON "Invoice"("customerId", "invoiceMonth");

-- CreateIndex
CREATE INDEX "Invoice_invoiceMonth_idx" ON "Invoice"("invoiceMonth");

-- CreateIndex
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_externalTxnId_key" ON "Transaction"("externalTxnId");

-- CreateIndex
CREATE INDEX "Transaction_customerId_ts_idx" ON "Transaction"("customerId", "ts");

-- CreateIndex
CREATE INDEX "Transaction_ts_idx" ON "Transaction"("ts");

-- CreateIndex
CREATE INDEX "Transaction_paymentMethod_idx" ON "Transaction"("paymentMethod");

-- CreateIndex
CREATE INDEX "Transaction_status_idx" ON "Transaction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CostDailyLedger_externalCostId_key" ON "CostDailyLedger"("externalCostId");

-- CreateIndex
CREATE INDEX "CostDailyLedger_date_idx" ON "CostDailyLedger"("date");

-- CreateIndex
CREATE INDEX "CostDailyLedger_customerId_date_idx" ON "CostDailyLedger"("customerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CostDailyLedger_customerId_date_key" ON "CostDailyLedger"("customerId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerEvent_externalEventId_key" ON "CustomerEvent"("externalEventId");

-- CreateIndex
CREATE INDEX "CustomerEvent_customerId_eventTs_idx" ON "CustomerEvent"("customerId", "eventTs");

-- CreateIndex
CREATE INDEX "CustomerEvent_eventType_idx" ON "CustomerEvent"("eventType");

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionMonthlySnapshot" ADD CONSTRAINT "SubscriptionMonthlySnapshot_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionMonthlySnapshot" ADD CONSTRAINT "SubscriptionMonthlySnapshot_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionMonthlySnapshot" ADD CONSTRAINT "SubscriptionMonthlySnapshot_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostDailyLedger" ADD CONSTRAINT "CostDailyLedger_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerEvent" ADD CONSTRAINT "CustomerEvent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
