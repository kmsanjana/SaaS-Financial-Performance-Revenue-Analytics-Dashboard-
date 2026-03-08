import { PrismaClient, Segment, Region, AcquisitionChannel, SubscriptionStatus, InvoiceStatus, PaymentMethod, TransactionStatus, CustomerEventType, Prisma } from "@prisma/client";
import { faker } from "@faker-js/faker";

const prisma = new PrismaClient();

type Config = {
  startDate: Date;
  endDate: Date;
  customers: number;
  monthsBack: number;
  dailyTxns: {
    SMB: number;
    MID: number;
    ENTERPRISE: number;
  };
};

const cfg: Config = {
  startDate: new Date("2024-01-01T00:00:00Z"),
  endDate: new Date("2026-01-31T00:00:00Z"),
  customers: 1200,
  monthsBack: 24,
  dailyTxns: { SMB: 18, MID: 60, ENTERPRISE: 240 },
};

const SEGMENT_PROBS: Array<[Segment, number]> = [
  [Segment.SMB, 0.72],
  [Segment.MID, 0.22],
  [Segment.ENTERPRISE, 0.06],
];

const REGION_PROBS: Array<[Region, number]> = [
  [Region.NA, 0.55],
  [Region.EU, 0.25],
  [Region.LATAM, 0.12],
  [Region.APAC, 0.08],
];

const CHANNEL_PROBS: Array<[AcquisitionChannel, number]> = [
  [AcquisitionChannel.ORGANIC, 0.50],
  [AcquisitionChannel.PAID_SEARCH, 0.22],
  [AcquisitionChannel.PARTNER, 0.18],
  [AcquisitionChannel.OUTBOUND, 0.10],
];

const CHURN_MONTHLY: Record<Segment, number> = {
  [Segment.SMB]: 0.035,
  [Segment.MID]: 0.018,
  [Segment.ENTERPRISE]: 0.008,
};

const P_UPGRADE = 0.018;
const P_DOWNGRADE = 0.012;

const TAKE_RATE: Record<PaymentMethod, number> = {
  [PaymentMethod.CARD]: 0.0075,
  [PaymentMethod.ACH]: 0.0020,
  [PaymentMethod.WIRE]: 0.0010,
};

const PROCESSOR_FEE_RATE: Record<PaymentMethod, number> = {
  [PaymentMethod.CARD]: 0.0215,
  [PaymentMethod.ACH]: 0.0025,
  [PaymentMethod.WIRE]: 0.0008,
};

const PROCESSOR_FIXED: Record<PaymentMethod, number> = {
  [PaymentMethod.CARD]: 0.10,
  [PaymentMethod.ACH]: 0.05,
  [PaymentMethod.WIRE]: 0.20,
};

const INFRA_COST_PER_TXN = 0.006;
const FRAUD_COST_PER_TXN = 0.004;
const CHARGEBACK_RATE = 0.0009;
const CHARGEBACK_LOSS_MULT = 1.2;

function weightedPick<T extends string>(pairs: Array<[T, number]>): T {
  const r = Math.random();
  let acc = 0;
  for (const [val, p] of pairs) {
    acc += p;
    if (r <= acc) return val;
  }
  return pairs[pairs.length - 1][0];
}

function monthStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
}

function addMonths(d: Date, n: number): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
}

function monthsBetweenInclusive(start: Date, end: Date): Date[] {
  const out: Date[] = [];
  let cur = monthStart(start);
  const last = monthStart(end);
  while (cur.getTime() <= last.getTime()) {
    out.push(cur);
    cur = addMonths(cur, 1);
  }
  return out;
}

function randomDateBetween(start: Date, end: Date): Date {
  const t = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(t);
}

function dayStart(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function addDays(d: Date, n: number): Date {
  const t = d.getTime() + n * 24 * 60 * 60 * 1000;
  return new Date(t);
}

function clampInt(x: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.floor(x)));
}

function genSeats(seg: Segment): number {
  if (seg === Segment.SMB) return clampInt(Math.exp(faker.number.float({ min: 1.7, max: 2.4 })), 3, 60);
  if (seg === Segment.MID) return clampInt(Math.exp(faker.number.float({ min: 3.0, max: 3.6 })), 25, 300);
  return clampInt(Math.exp(faker.number.float({ min: 3.9, max: 4.5 })), 120, 1500);
}

function initialPlanCode(seg: Segment): "starter" | "growth" | "scale" {
  if (seg === Segment.SMB) return Math.random() < 0.78 ? "starter" : "growth";
  if (seg === Segment.MID) return Math.random() < 0.75 ? "growth" : "scale";
  return Math.random() < 0.88 ? "scale" : "growth";
}

function nextPlanCode(cur: string, dir: "up" | "down"): "starter" | "growth" | "scale" {
  const order: Array<"starter" | "growth" | "scale"> = ["starter", "growth", "scale"];
  const idx = order.indexOf(cur as any);
  if (idx < 0) return "starter";
  if (dir === "up") return order[Math.min(idx + 1, order.length - 1)];
  return order[Math.max(idx - 1, 0)];
}

function poisson(lambda: number): number {
  const L = Math.exp(-lambda);
  let p = 1.0;
  let k = 0;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

function toDecimal(n: number, scale = 2): Prisma.Decimal {
  return new Prisma.Decimal(n.toFixed(scale));
}

async function main() {
  faker.seed(42);

  console.log("🌱 Starting seed...");

  const plansSeed = [
    { planCode: "starter", planName: "Starter", baseMrr: new Prisma.Decimal("199.00"), perSeatMrr: new Prisma.Decimal("12.00") },
    { planCode: "growth", planName: "Growth", baseMrr: new Prisma.Decimal("599.00"), perSeatMrr: new Prisma.Decimal("18.00") },
    { planCode: "scale", planName: "Scale", baseMrr: new Prisma.Decimal("1499.00"), perSeatMrr: new Prisma.Decimal("24.00") },
  ];

  console.log("📋 Seeding plans...");
  for (const p of plansSeed) {
    await prisma.plan.upsert({
      where: { planCode: p.planCode },
      update: {},
      create: p,
    });
  }

  const planRows = await prisma.plan.findMany();
  const planByCode = new Map(planRows.map(p => [p.planCode, p]));
  if (!planByCode.get("starter") || !planByCode.get("growth") || !planByCode.get("scale")) {
    throw new Error("Plans missing; upsert failed.");
  }

  console.log("👥 Creating customers...");
  const customersData: Prisma.CustomerCreateManyInput[] = [];
  const totalDays = Math.floor((cfg.endDate.getTime() - cfg.startDate.getTime()) / (24 * 3600 * 1000));
  
  for (let i = 0; i < cfg.customers; i++) {
    const seg = weightedPick(SEGMENT_PROBS);
    // Spread customers across 80% of the time period (leave last 20% for cohort aging)
    const dayOffset = Math.floor(Math.random() * totalDays * 0.8);
    const createdAt = new Date(cfg.startDate.getTime() + dayOffset * 24 * 3600 * 1000);
    
    customersData.push({
      externalCustomerId: `C${String(i + 1).padStart(6, "0")}`,
      createdAt,
      segment: seg,
      region: weightedPick(REGION_PROBS),
      acquisitionChannel: weightedPick(CHANNEL_PROBS),
      baseSeatCount: genSeats(seg),
      isActive: true,
    });
  }

  const chunkSize = 500;
  for (let i = 0; i < customersData.length; i += chunkSize) {
    await prisma.customer.createMany({ data: customersData.slice(i, i + chunkSize) });
  }

  const customers = await prisma.customer.findMany({
    select: { id: true, externalCustomerId: true, createdAt: true, segment: true, baseSeatCount: true },
  });

  const months = monthsBetweenInclusive(cfg.startDate, cfg.endDate);

  console.log("📝 Creating subscriptions and events...");
  const subsToCreate: Prisma.SubscriptionCreateManyInput[] = [];
  const eventsToCreate: Prisma.CustomerEventCreateManyInput[] = [];
  const snapshotsToCreate: Prisma.SubscriptionMonthlySnapshotCreateManyInput[] = [];
  const invoicesToCreate: Prisma.InvoiceCreateManyInput[] = [];

  let subCounter = 1;

  for (const c of customers) {
    eventsToCreate.push({
      externalEventId: `E${String(eventsToCreate.length + 1).padStart(8, "0")}`,
      customerId: c.id,
      eventTs: new Date(c.createdAt.getTime() + faker.number.int({ min: 0, max: 23 }) * 3600 * 1000),
      eventType: CustomerEventType.SIGNUP,
    });

    const code = initialPlanCode(c.segment);
    const plan = planByCode.get(code)!;

    const startMonth = monthStart(c.createdAt);
    subsToCreate.push({
      externalSubId: `S${String(subCounter).padStart(6, "0")}`,
      customerId: c.id,
      planId: plan.id,
      startDate: startMonth,
      endDate: null,
      status: SubscriptionStatus.ACTIVE,
    });
    subCounter++;
  }

  for (let i = 0; i < subsToCreate.length; i += chunkSize) {
    await prisma.subscription.createMany({ data: subsToCreate.slice(i, i + chunkSize) });
  }

  const subs = await prisma.subscription.findMany({
    include: { customer: true, plan: true },
  });

  console.log("📊 Simulating subscription lifecycle...");
  for (const sub of subs) {
    const c = sub.customer;
    let curPlanCode = sub.plan.planCode;
    let seats = clampInt(Math.round(c.baseSeatCount * faker.number.float({ min: 0.85, max: 1.15 })), 1, 5000);

    const subStart = monthStart(sub.startDate);
    let active = true;
    let endDate: Date | null = null;

    for (const m of months) {
      if (m.getTime() < subStart.getTime()) continue;
      if (!active) break;

      const tenureMonths = (m.getUTCFullYear() - subStart.getUTCFullYear()) * 12 + (m.getUTCMonth() - subStart.getUTCMonth());
      const churnBase = CHURN_MONTHLY[c.segment];
      const pChurn = churnBase * (tenureMonths >= 6 ? 0.70 : 1.0);

      if (tenureMonths >= 1 && Math.random() < pChurn) {
        active = false;
        endDate = m;

        eventsToCreate.push({
          externalEventId: `E${String(eventsToCreate.length + 1).padStart(8, "0")}`,
          customerId: c.id,
          eventTs: new Date(m.getTime() + faker.number.int({ min: 0, max: 9 }) * 24 * 3600 * 1000),
          eventType: CustomerEventType.CANCEL,
        });
        break;
      }

      if (Math.random() < P_UPGRADE) {
        const newCode = nextPlanCode(curPlanCode, "up");
        if (newCode !== curPlanCode) {
          curPlanCode = newCode;
          eventsToCreate.push({
            externalEventId: `E${String(eventsToCreate.length + 1).padStart(8, "0")}`,
            customerId: c.id,
            eventTs: new Date(m.getTime() + faker.number.int({ min: 0, max: 9 }) * 24 * 3600 * 1000),
            eventType: CustomerEventType.UPGRADE,
          });
        }
      }
      if (Math.random() < P_DOWNGRADE) {
        const newCode = nextPlanCode(curPlanCode, "down");
        if (newCode !== curPlanCode) {
          curPlanCode = newCode;
          eventsToCreate.push({
            externalEventId: `E${String(eventsToCreate.length + 1).padStart(8, "0")}`,
            customerId: c.id,
            eventTs: new Date(m.getTime() + faker.number.int({ min: 0, max: 9 }) * 24 * 3600 * 1000),
            eventType: CustomerEventType.DOWNGRADE,
          });
        }
      }

      const drift = faker.number.float({ min: -0.05, max: 0.08 });
      seats = clampInt(seats * (1 + drift * 0.25), 1, 5000);

      const plan = planByCode.get(curPlanCode)!;
      const mrr = plan.baseMrr.plus(plan.perSeatMrr.times(seats));

      snapshotsToCreate.push({
        customerId: c.id,
        subscriptionId: sub.id,
        planId: plan.id,
        snapshotMonth: m,
        seats,
        mrr,
      });

      let discountRate = 0.0;
      if (c.segment === Segment.ENTERPRISE && Math.random() < 0.55) discountRate = faker.number.float({ min: 0.05, max: 0.18 });
      else if (c.segment === Segment.MID && Math.random() < 0.25) discountRate = faker.number.float({ min: 0.03, max: 0.12 });

      const subtotal = mrr;
      const discount = subtotal.times(discountRate);
      const total = subtotal.minus(discount);

      const failProb = c.segment === Segment.SMB ? 0.02 : 0.01;
      const paid = Math.random() > failProb;

      invoicesToCreate.push({
        externalInvoiceId: `I${String(invoicesToCreate.length + 1).padStart(9, "0")}`,
        customerId: c.id,
        subscriptionId: sub.id,
        invoiceMonth: m,
        amountSubtotal: subtotal,
        discount,
        amountTotal: total,
        paidAt: paid ? new Date(m.getTime() + faker.number.int({ min: 0, max: 11 }) * 24 * 3600 * 1000) : null,
        status: paid ? InvoiceStatus.PAID : InvoiceStatus.FAILED,
      });
    }

    if (endDate) {
      await prisma.subscription.update({
        where: { id: sub.id },
        data: { endDate, status: SubscriptionStatus.CANCELED },
      });
      await prisma.customer.update({
        where: { id: c.id },
        data: { isActive: false },
      });
    }
  }

  console.log("💾 Inserting events, snapshots, and invoices...");
  for (let i = 0; i < eventsToCreate.length; i += 2000) {
    await prisma.customerEvent.createMany({ data: eventsToCreate.slice(i, i + 2000) });
  }
  for (let i = 0; i < snapshotsToCreate.length; i += 5000) {
    await prisma.subscriptionMonthlySnapshot.createMany({ data: snapshotsToCreate.slice(i, i + 5000) });
  }
  for (let i = 0; i < invoicesToCreate.length; i += 5000) {
    await prisma.invoice.createMany({ data: invoicesToCreate.slice(i, i + 5000) });
  }

  console.log("💳 Generating transactions and costs...");
  const days: Date[] = [];
  let d = dayStart(cfg.startDate);
  const lastDay = dayStart(cfg.endDate);
  while (d.getTime() <= lastDay.getTime()) {
    days.push(d);
    d = addDays(d, 1);
  }

  const snapshotMonths = await prisma.subscriptionMonthlySnapshot.findMany({
    select: { customerId: true, snapshotMonth: true },
  });
  const activeMonthsByCustomer = new Map<string, Set<number>>();
  for (const s of snapshotMonths) {
    const key = s.customerId;
    const m = monthStart(s.snapshotMonth).getTime();
    if (!activeMonthsByCustomer.has(key)) activeMonthsByCustomer.set(key, new Set());
    activeMonthsByCustomer.get(key)!.add(m);
  }

  const customersAgain = await prisma.customer.findMany({
    select: { id: true, segment: true },
  });

  const txBatch: Prisma.TransactionCreateManyInput[] = [];
  const costAgg = new Map<string, { processing: number; infra: number; fraud: number; chargeback: number }>();
  let txnCounter = 1;

  function paymentMethodForSeg(seg: Segment): PaymentMethod {
    const r = Math.random();
    if (r < 0.82) return PaymentMethod.CARD;
    if (r < 0.98) return PaymentMethod.ACH;
    return PaymentMethod.WIRE;
  }

  function txnAmount(seg: Segment): number {
    if (seg === Segment.SMB) return Math.exp(faker.number.float({ min: 3.2, max: 4.1 }));
    if (seg === Segment.MID) return Math.exp(faker.number.float({ min: 3.8, max: 4.6 }));
    return Math.exp(faker.number.float({ min: 4.3, max: 5.2 }));
  }

  for (const day of days) {
    const mKey = monthStart(day).getTime();

    for (const c of customersAgain) {
      const activeMonths = activeMonthsByCustomer.get(c.id);
      if (!activeMonths || !activeMonths.has(mKey)) continue;

      const lambda = c.segment === Segment.SMB ? cfg.dailyTxns.SMB
        : c.segment === Segment.MID ? cfg.dailyTxns.MID
        : cfg.dailyTxns.ENTERPRISE;

      const n = poisson(lambda);
      if (n <= 0) continue;

      for (let i = 0; i < n; i++) {
        const method = paymentMethodForSeg(c.segment);
        const amount = txnAmount(c.segment);
        const ts = new Date(day.getTime() + faker.number.int({ min: 0, max: 1439 }) * 60 * 1000);

        let status: TransactionStatus = TransactionStatus.SUCCEEDED;
        if (Math.random() < 0.015) status = TransactionStatus.FAILED;
        else if (method === PaymentMethod.CARD && Math.random() < 0.008) status = TransactionStatus.REFUNDED;

        const revenue = status === TransactionStatus.SUCCEEDED ? TAKE_RATE[method] * amount : 0.0;

        txBatch.push({
          externalTxnId: `T${String(txnCounter).padStart(12, "0")}`,
          customerId: c.id,
          ts,
          amount: toDecimal(amount, 2),
          currency: "USD",
          paymentMethod: method,
          status,
          merchantFeeRevenue: toDecimal(revenue, 4),
        });
        txnCounter++;

        if (status === TransactionStatus.SUCCEEDED) {
          const proc = PROCESSOR_FEE_RATE[method] * amount + PROCESSOR_FIXED[method];
          const infra = INFRA_COST_PER_TXN;
          const fraud = FRAUD_COST_PER_TXN;

          let chargeback = 0.0;
          if (method === PaymentMethod.CARD && Math.random() < CHARGEBACK_RATE) {
            chargeback = amount * CHARGEBACK_LOSS_MULT;
          }

          const aggKey = `${c.id}::${day.toISOString().slice(0, 10)}`;
          const cur = costAgg.get(aggKey) ?? { processing: 0, infra: 0, fraud: 0, chargeback: 0 };
          cur.processing += proc;
          cur.infra += infra;
          cur.fraud += fraud;
          cur.chargeback += chargeback;
          costAgg.set(aggKey, cur);
        }
      }
    }

    if (txBatch.length >= 25000) {
      await prisma.transaction.createMany({ data: txBatch });
      txBatch.length = 0;
    }
  }

  if (txBatch.length > 0) {
    await prisma.transaction.createMany({ data: txBatch });
  }

  console.log("💰 Inserting cost ledger...");
  const costRows: Prisma.CostDailyLedgerCreateManyInput[] = [];
  let costCounter = 1;
  for (const [key, v] of costAgg.entries()) {
    const [customerId, dateStr] = key.split("::");
    costRows.push({
      externalCostId: `K${String(costCounter).padStart(12, "0")}`,
      customerId,
      date: new Date(`${dateStr}T00:00:00Z`),
      processingFees: toDecimal(v.processing, 4),
      infraCost: toDecimal(v.infra, 4),
      fraudToolCost: toDecimal(v.fraud, 4),
      chargebackLoss: toDecimal(v.chargeback, 4),
    });
    costCounter++;
  }

  for (let i = 0; i < costRows.length; i += 5000) {
    await prisma.costDailyLedger.createMany({ data: costRows.slice(i, i + 5000) });
  }

  console.log("\n✅ Seed complete!");
  console.log(`📊 Summary:`);
  console.log(`   Customers: ${customers.length}`);
  console.log(`   Subscriptions: ${subs.length}`);
  console.log(`   Monthly Snapshots: ${snapshotsToCreate.length}`);
  console.log(`   Invoices: ${invoicesToCreate.length}`);
  console.log(`   Transactions: ${txnCounter - 1}`);
  console.log(`   Daily Cost Rows: ${costRows.length}`);
  console.log(`   Customer Events: ${eventsToCreate.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
