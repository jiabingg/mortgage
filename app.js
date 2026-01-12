const fmtCurrency = (n) =>
  n.toLocaleString(undefined, { style: "currency", currency: "USD" });

const form = document.getElementById("mortgage-form");
const errorP = document.getElementById("error");

const summary = document.getElementById("summary");
const principalEl = document.getElementById("principal");
const baseEl = document.getElementById("base");
const withExtraEl = document.getElementById("withExtra");
const monthsEl = document.getElementById("months");
const interestEl = document.getElementById("interest");
const totalEl = document.getElementById("total");

const scheduleSection = document.getElementById("schedule-section");
const tbody = document.querySelector("#schedule-table tbody");
const rowsSelect = document.getElementById("rows-select");
const downloadBtn = document.getElementById("download-csv");

let lastSchedule = [];

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorP.hidden = true;

  const data = Object.fromEntries(new FormData(form).entries());

  // Cast to numbers
  const body = {
    price: Number(data.price),
    downPayment: Number(data.downPayment || 0),
    annualRate: Number(data.annualRate),
    years: Number(data.years),
    extraMonthly: Number(data.extraMonthly || 0)
  };

  try {
    const res = await fetch("/api/calc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.details ? err.details.join(", ") : err.error || "Failed");
    }

    const result = await res.json();
    renderSummary(result);
    lastSchedule = result.schedule || [];
    renderSchedule();
  } catch (err) {
    errorP.textContent = err.message;
    errorP.hidden = false;
    summary.hidden = true;
    scheduleSection.hidden = true;
  }
});

rowsSelect.addEventListener("change", renderSchedule);
downloadBtn.addEventListener("click", () => downloadCSV(lastSchedule));

function renderSummary(r) {
  summary.hidden = false;
  principalEl.textContent = fmtCurrency(r.principal);
  baseEl.textContent = fmtCurrency(r.monthlyPaymentBase);
  withExtraEl.textContent = fmtCurrency(r.monthlyPaymentWithExtra);
  monthsEl.textContent = r.monthsToPayoff.toString();
  interestEl.textContent = fmtCurrency(r.totalInterest);
  totalEl.textContent = fmtCurrency(r.totalPayment);
}

function renderSchedule() {
  const limit = Number(rowsSelect.value);
  scheduleSection.hidden = lastSchedule.length === 0;
  tbody.innerHTML = "";

  const rows = lastSchedule.slice(0, limit >= 9999 ? lastSchedule.length : limit);
  const frag = document.createDocumentFragment();

  for (const row of rows) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${row.month}</td>
      <td>${fmtCurrency(row.payment)}</td>
      <td>${fmtCurrency(row.principal)}</td>
      <td>${fmtCurrency(row.interest)}</td>
      <td>${fmtCurrency(row.balance)}</td>
    `;
    frag.appendChild(tr);
  }

  tbody.appendChild(frag);
}

function downloadCSV(schedule) {
  if (!schedule?.length) return;
  const header = ["Month", "Payment", "Principal", "Interest", "Balance"];
  const lines = [header.join(",")];

  for (const r of schedule) {
    lines.push([r.month, r.payment, r.principal, r.interest, r.balance].join(","));
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "amortization.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
