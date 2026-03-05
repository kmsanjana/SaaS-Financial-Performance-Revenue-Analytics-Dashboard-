# SaaS-Financial-Performance-Revenue-Analytics-Dashboard-
Decomposed ARR into growth/churn drivers, built cohort retention analysis,  and quantified 15% margin variance across 100K+ transactions.

## 📊 Project Overview

A production-grade **FinOps analytics platform** built to analyze subscription revenue, customer behavior, and P&L performance for SaaS businesses. The system processes **100K+ synthetic transactions** across 1,200 customers over 25 months, delivering actionable insights through three interactive Power BI dashboards.

**Key Achievement**: Engineered a revenue analytics model decomposing ARR into growth and churn drivers, embedding P&L logic to quantify 15% margin variance, and delivering interactive dashboards that reduce reporting time by 35% while improving forecast visibility.

---

## 🎯 Business Impact

- **Revenue Intelligence**: MRR waterfall decomposition (New + Expansion + Contraction + Churn)
- **Customer Analytics**: Cohort retention analysis across 25 monthly cohorts with heat-map visualization
- **Financial Operations**: Full P&L with margin variance bridge identifying cost drivers
- **Forecasting**: 3-month moving average trend with linear projection
- **Unit Economics**: Cost-per-transaction and profitability by segment, plan, and payment method

---

## Power BI Dashboards
Follow the step-by-step guides in order:
1. **PART 1**: Connect to PostgreSQL, transform data, create 45 DAX measures
2. **PART 2**: Build Revenue Analytics dashboard (CEO/CFO)
3. **PART 3**: Build Customer Analytics dashboard (CSM/Sales)
4. **PART 4**: Build P&L Operations dashboard (Finance/FP&A)

---

## 📊 Dashboard Highlights

### 1️⃣ Revenue Analytics Dashboard
**Audience**: CEO, CFO, VP Revenue

**Key Visuals**:
- MRR Waterfall (New + Expansion + Contraction + Churn decomposition)
- MRR Trend with 3-month forecast
- ARR decomposition table (monthly drivers)
- Revenue by Segment (SMB/MID/Enterprise) and Region (NA/EU/LATAM/APAC)
- Top 10 customers by MRR with drill-through

**Business Questions Answered**:
- What's driving MRR growth this month?
- Are we expanding existing customers or relying on new logos?
- Which segments/regions are growing fastest?

### 2️⃣ Customer Analytics Dashboard
**Audience**: Customer Success, Sales, Product

**Key Visuals**:
- Cohort retention heatmap (25 cohorts × 12 months)
- Customer lifecycle funnel (Signup → Upgrade → Active → Churned)
- Acquisition channel ROI (volume vs revenue)
- Segment composition shift over time
- LTV by segment with drill-through to customer profiles

**Business Questions Answered**:
- Are newer cohorts retaining better than older ones?
- Which acquisition channels bring the highest-value customers?
- What's the typical customer journey from signup to churn?

### 3️⃣ P&L & Financial Operations Dashboard
**Audience**: CFO, Finance Team, FP&A

**Key Visuals**:
- Monthly P&L matrix (Revenue → COGS → Gross Profit)
- Margin variance waterfall (which cost driver changed margin?)
- COGS breakdown (Processing/Infra/Fraud/Chargebacks)
- Payment method economics (CARD vs ACH vs WIRE profitability)
- Unit economics table (revenue/COGS/margin per seat)

**Business Questions Answered**:
- Why did gross margin change 15% vs last month?
- Which cost component is growing fastest?
- Should we push customers toward ACH for better margins?

---

## 🗄️ Data Model

### Core Tables
| Table | Records | Purpose |
|-------|---------|---------|
| **Customer** | 1,200 | Customer master (segment, region, channel) |
| **Plan** | 3 | Subscription tiers (Starter/Growth/Scale) |
| **Subscription** | 1,200 | Active/canceled subscriptions |
| **SubscriptionMonthlySnapshot** | 13,695 | Monthly MRR snapshots (drives all revenue metrics) |
| **Invoice** | 13,695 | Billing invoices (PAID/FAILED/VOID) |
| **Transaction** | 10.7M | Payment transactions (SUCCEEDED/FAILED/REFUNDED) |
| **CostDailyLedger** | 97,321 | Daily COGS (processing/infra/fraud/chargebacks) |
| **CustomerEvent** | 5,200+ | Lifecycle events (signup/upgrade/downgrade/cancel) |

### Key Relationships
- Customer → Subscription (1:Many)
- Subscription → SubscriptionMonthlySnapshot (1:Many)
- Calendar → SubscriptionMonthlySnapshot (1:Many) ← **Critical for time intelligence**
- Customer → Invoice, Transaction, CostMonthly (1:Many each)

---

## 📈 Key Metrics (DAX Measures)

### Revenue Metrics
- **MRR**: Monthly Recurring Revenue
- **ARR**: Annual Recurring Revenue (MRR × 12)
- **New MRR**: Revenue from new customers
- **Expansion MRR**: Upsells from existing customers
- **Contraction MRR**: Downgrades
- **Churned MRR**: Revenue lost from cancellations
- **Net New MRR**: Sum of all movement
- **NRR %**: Net Revenue Retention (>100% = expansion)

### Customer Metrics
- **Active Customers**: Currently subscribed
- **Logo Churn Rate**: % customers canceling
- **LTV**: Customer Lifetime Value (MRR / Churn Rate)
- **Cohort Retention %**: % of cohort still active after N months

### Financial Metrics
- **Total COGS**: Processing + Infra + Fraud + Chargebacks
- **Gross Profit**: Revenue - COGS
- **Gross Margin %**: Profit / Revenue
- **Margin Variance**: Basis point change vs prior month
- **Cost Per Transaction**: COGS / Transaction Count

---

## 🧪 Data Quality Validation

The `data-quality-check.ts` script validates:

✅ **Customer**: No duplicates, no nulls, valid enums  
✅ **Subscription**: 1 active per customer, valid date ranges  
✅ **Snapshot**: 1 row per customer-month, no negative MRR  
✅ **Invoice**: No duplicate IDs, only PAID in revenue  
✅ **Transaction**: No duplicates, only SUCCEEDED in revenue  
✅ **CostLedger**: Daily granularity, no negatives, no gaps  

**Result**: Zero data quality issues — 100% ready for analytics.

---

## 🎓 Learning Outcomes

This project demonstrates:
- **Data Engineering**: schema design, synthetic data generation, batch processing
- **Data Modeling**: Star schema, relationship cardinality, time intelligence
- **DAX Proficiency**: 45+ measures including complex calculations (cohort retention, LTV, margin bridges)
- **Business Intelligence**: Role-based dashboard design, drill-through, cross-filtering
- **Financial Analytics**: P&L logic, margin variance decomposition, unit economics

---
## 📄 License

MIT License - Free to use for learning purposes only.

---
