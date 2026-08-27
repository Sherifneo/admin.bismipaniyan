import { getFinancialYear, listFinancialYears } from "../../utils/financialYear";

// Pure reference screen — no API calls, no editing. Just the Indian
// financial year (1 Apr - 31 Mar) computed client-side from today's
// date, plus a simple list of surrounding years. Deliberately not wired
// into any report yet (see admin-portal CLAUDE.md).
function formatFyDate(d) {
  const day = String(d.getDate()).padStart(2, "0");
  const month = d.toLocaleDateString("en-IN", { month: "short" });
  return `${day} ${month} ${d.getFullYear()}`;
}

export default function CalendarPage() {
  const current = getFinancialYear();
  const years = listFinancialYears();

  return (
    <div>
      <h1 className="bp-page-title">Financial Year</h1>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Bismi's financial year runs 1 April to 31 March, matching the Indian statutory year.
      </p>

      <div className="bp-table-wrap" style={{ padding: 20, maxWidth: 420, marginBottom: 20 }}>
        <div className="bp-td-muted" style={{ fontSize: 12, marginBottom: 4 }}>Current Financial Year</div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>{current.label}</div>
        <div className="bp-td-muted" style={{ marginTop: 4 }}>
          {formatFyDate(current.startDate)} — {formatFyDate(current.endDate)}
        </div>
      </div>

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <th>Financial Year</th>
              <th>Start date</th>
              <th>End date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {years.map((fy) => (
              <tr key={fy.startYear}>
                <td className="bp-td-strong">{fy.label}</td>
                <td className="bp-td-muted">{formatFyDate(fy.startDate)}</td>
                <td className="bp-td-muted">{formatFyDate(fy.endDate)}</td>
                <td>
                  {fy.startYear === current.startYear && (
                    <span className="bp-badge bp-badge-success">Current</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
