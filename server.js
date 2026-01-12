import express from "express";
import morgan from "morgan";
import cors from "cors";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(morgan("dev"));
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// --- Core calculation logic (backend) ---
function calcMortgage({ price, downPayment, annualRate, years, extraMonthly = 0 }) {
  // Validate
  const errors = [];
  const toNum = (v) => (typeof v === "string" ? Number(v) : v);

  price = toNum(price);
  downPayment = toNum(downPayment ?? 0);
  annualRate = toNum(annualRate);
  years = toNum(years);
  extraMonthly = toNum(extraMonthly ?? 0);

  if (!(price > 0)) errors.push("price must be > 0");
  if (!(downPayment >= 0)) errors.push("downPayment must be >= 0");
  if (!(years > 0)) errors.push("years must be > 0");
  if (!(annualRate >= 0)) errors.push("annualRate must be >= 0");
  if (downPayment >= price) errors.push("downPayment must be less than price");
  if (!(extraMonthly >= 0)) errors.push("extraMonthly must be >= 0");

  if (errors.length) {
    const err = new Error("Invalid input");
    err.status = 400;
    err.details = errors;
    throw err;
  }

  const principal = price - downPayment;
  const n = Math.round(years * 12);          // number of payments
  const r = annualRate / 100 / 12;           // monthly interest rate

  // Standard amortization payment (without extra)
  let basePayment;
  if (r === 0) {
    basePayment = principal / n;
  } else {
    const pow = Math.pow(1 + r, n);
    basePayment = principal * (r * pow) / (pow - 1);
  }

  const scheduledPayment = basePayment + extraMonthly;

  // Build amortization schedule
  let balance = principal;
  let totalInterest = 0;
  const schedule = [];
  let month = 0;

  while (balance > 0 && month < n + 600) { // +buffer in case of extra payments
    month += 1;
    const interest = r === 0 ? 0 : balance * r;
    let principalPaid = scheduledPayment - interest;

    // Prevent overpayment on last installment
    if (principalPaid > balance) principalPaid = balance;

    const newBalance = balance - principalPaid;
    totalInterest += interest;

    schedule.push({
      month,
      interest: Number(interest.toFixed(2)),
      principal: Number(principalPaid.toFixed(2)),
      payment: Number((principalPaid + interest).toFixed(2)),
      balance: Number(newBalance.toFixed(2))
    });

    balance = newBalance;

    // If r === 0, avoid infinite loop due to fp rounding
    if (r === 0 && balance <= 0.01) {
      balance = 0;
      break;
    }
  }

  const totalPayment = schedule.reduce((s, p) => s + p.payment, 0);

  return {
    inputs: { price, downPayment, annualRate, years, extraMonthly },
    principal: Number(principal.toFixed(2)),
    monthlyRate: r,
    numPaymentsPlanned: n,
    monthlyPaymentBase: Number(basePayment.toFixed(2)),
    monthlyPaymentWithExtra: Number(scheduledPayment.toFixed(2)),
    totalInterest: Number(totalInterest.toFixed(2)),
    totalPayment: Number(totalPayment.toFixed(2)),
    monthsToPayoff: schedule.length,
    schedule
  };
}

// API: POST /api/calc
app.post("/api/calc", (req, res, next) => {
  try {
    const result = calcMortgage(req.body || {});
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// Simple health check
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Server error",
    details: err.details || undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Mortgage app listening on http://localhost:${PORT}`);
});
