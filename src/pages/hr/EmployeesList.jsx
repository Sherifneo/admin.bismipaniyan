import { useEffect, useState } from "react";
import { employeesApi, locationsApi, positionsApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import Modal from "../../components/Modal";
import CodeField, { useCodePreview } from "../../components/CodeField";
import { useDataTable, SearchByBar, ColumnHeader, DataTableToolbar, SelectAllHeaderCell, SelectRowCell } from "../../components/DataTable";

function inr(n) {
  return "₹" + Number(n || 0).toLocaleString("en-IN");
}

// Bismi's paid workforce — bakers, packers, helpers. Distinct from
// `admins` (who can sign into this portal); employees are tracked for
// payroll (see Salary Payments) and, on Production Runs, assigned to the
// Mixing/Baking/Packing stages.
export default function EmployeesList({ onManagePositions }) {
  const [employees, setEmployees] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [editEmployee, setEditEmployee] = useState(null);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await employeesApi.list({ includeInactive: true });
      setEmployees(data.items || []);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load employees.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    locationsApi.list().then(setLocations).catch(() => {});
  }, []);

  async function onSaved() {
    setShowAdd(false);
    setEditEmployee(null);
    await load();
  }

  const columns = [
    { key: "employee_code", label: "Code", accessor: (e) => e.employee_code || "" },
    { key: "full_name", label: "Name", accessor: (e) => e.full_name },
    { key: "role_designation", label: "Role", accessor: (e) => e.role_designation || "" },
    { key: "location_name", label: "Location", accessor: (e) => e.location_name || "" },
    { key: "mobile", label: "Mobile", accessor: (e) => e.mobile || "" },
    { key: "monthly_salary", label: "Monthly salary", accessor: (e) => e.monthly_salary, filter: "number" },
    { key: "date_of_hire", label: "Date of hire", accessor: (e) => e.date_of_hire || "", filter: "dateRange" },
    {
      key: "is_active", label: "Active", accessor: (e) => (e.is_active ? "yes" : "no"), filter: "select",
      options: [{ value: "yes", label: "Yes" }, { value: "no", label: "No" }],
    },
  ];
  const table = useDataTable({ rows: employees, columns, rowKey: (e) => e.employee_id });

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 10 }}>
        <h1 className="bp-page-title">Employees</h1>
        <button type="button" className="bp-btn-primary" onClick={() => setShowAdd(true)}>+ Add employee</button>
      </div>
      <p className="bp-td-muted" style={{ margin: "-6px 0 14px" }}>
        Bismi's staff roster — used for payroll (see Salary Payments) and worker assignment on production runs.
      </p>

      {error && <div className="bp-inline-error">{error}</div>}

      <DataTableToolbar table={table} filename="employees" totalCount={employees.length} />
      <SearchByBar table={table} columns={columns} />

      <div className="bp-table-wrap">
        <table className="bp-table">
          <thead>
            <tr>
              <SelectAllHeaderCell table={table} />
              <ColumnHeader table={table} column={columns[0]} />
              <ColumnHeader table={table} column={columns[1]} />
              <ColumnHeader table={table} column={columns[2]} />
              <ColumnHeader table={table} column={columns[3]} />
              <ColumnHeader table={table} column={columns[4]} />
              <ColumnHeader table={table} column={columns[5]} />
              <ColumnHeader table={table} column={columns[6]} />
              <ColumnHeader table={table} column={columns[7]} />
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={10} className="bp-table-empty">Loading…</td></tr>
            ) : table.filteredRows.length === 0 ? (
              <tr><td colSpan={10} className="bp-table-empty">No employees found.</td></tr>
            ) : (
              table.filteredRows.map((e) => (
                <tr key={e.employee_id} onClick={() => setEditEmployee(e)} style={{ cursor: "pointer" }}>
                  <SelectRowCell table={table} row={e} />
                  <td className="bp-td-muted">{e.employee_code || "—"}</td>
                  <td className="bp-td-strong">{e.full_name}</td>
                  <td className="bp-td-muted">{e.role_designation || "—"}</td>
                  <td className="bp-td-muted">{e.location_name || "—"}</td>
                  <td className="bp-td-muted">{e.mobile || "—"}</td>
                  <td>{inr(e.monthly_salary)}</td>
                  <td className="bp-td-muted">{e.date_of_hire || "—"}</td>
                  <td className="bp-td-muted">{e.is_active ? "Yes" : "No"}</td>
                  <td className="bp-td-actions">
                    <button type="button" className="bp-btn-sm" onClick={(ev) => { ev.stopPropagation(); setEditEmployee(e); }}>Edit</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showAdd && <EmployeeModal locations={locations} onClose={() => setShowAdd(false)} onDone={onSaved} onManagePositions={onManagePositions} />}
      {editEmployee && <EmployeeModal employee={editEmployee} locations={locations} onClose={() => setEditEmployee(null)} onDone={onSaved} onManagePositions={onManagePositions} />}
    </div>
  );
}

function EmployeeModal({ employee, locations, onClose, onDone, onManagePositions }) {
  const isEdit = !!employee;
  const [fullName, setFullName] = useState(employee?.full_name || "");
  const [aadharNumber, setAadharNumber] = useState(employee?.aadhar_number || "");
  const [mobile, setMobile] = useState(employee?.mobile || "");
  const [monthlySalary, setMonthlySalary] = useState(employee?.monthly_salary ?? "");
  const [roleDesignation, setRoleDesignation] = useState(employee?.role_designation || "");
  const [locationId, setLocationId] = useState(employee?.location_id || "");
  const [dateOfHire, setDateOfHire] = useState(employee?.date_of_hire || "");
  const [endDate, setEndDate] = useState(employee?.end_date || "");
  const [isActive, setIsActive] = useState(employee ? !!employee.is_active : true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [positions, setPositions] = useState([]);
  const codeField = useCodePreview("employee", isEdit ? employee.employee_code : null);

  useEffect(() => {
    positionsApi.list({}).then((data) => setPositions(data.items || [])).catch(() => {});
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!fullName.trim()) {
      setError("Name is required.");
      return;
    }
    if (!locationId) {
      setError("Select a base location.");
      return;
    }
    if (!roleDesignation) {
      setError("Select a position.");
      return;
    }
    const salaryNum = Number(monthlySalary);
    if (!Number.isFinite(salaryNum) || salaryNum <= 0) {
      setError("Enter a valid monthly salary.");
      return;
    }
    if (codeField.mode === "manual" && !isEdit && !codeField.value.trim()) {
      setError("Enter an employee code.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const body = {
        full_name: fullName.trim(),
        aadhar_number: aadharNumber || undefined,
        mobile: mobile || undefined,
        monthly_salary: salaryNum,
        role_designation: roleDesignation,
        location_id: locationId,
        date_of_hire: dateOfHire || undefined,
        end_date: endDate || undefined,
        is_active: isActive,
        employee_code: codeField.mode === "manual" && !isEdit ? codeField.value.trim() : undefined,
      };
      if (isEdit) {
        await employeesApi.update(employee.employee_id, body);
      } else {
        await employeesApi.create(body);
      }
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save this employee.");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? `Edit — ${employee.full_name}` : "Add employee"} onClose={onClose}>
      <form onSubmit={submit} className="bp-form">
        {error && <div className="bp-inline-error">{error}</div>}

        <CodeField label="Employee code" field={codeField} isEdit={isEdit} />

        <label className="bp-field-label" htmlFor="eName">Full name</label>
        <input id="eName" type="text" className="bp-field-input" value={fullName} onChange={(ev) => setFullName(ev.target.value)} required autoFocus />

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="eAadhar">Aadhar number</label>
            <input id="eAadhar" type="text" className="bp-field-input" value={aadharNumber} onChange={(ev) => setAadharNumber(ev.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="eMobile">Mobile</label>
            <input id="eMobile" type="tel" className="bp-field-input" value={mobile} onChange={(ev) => setMobile(ev.target.value)} />
          </div>
        </div>

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="eRole">Position</label>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
              <select id="eRole" className="bp-field-input" value={roleDesignation} onChange={(ev) => setRoleDesignation(ev.target.value)} style={{ flex: 1 }} required>
                <option value="">Select a position…</option>
                {positions.map((p) => <option key={p.position_id} value={p.name}>{p.name}</option>)}
                {roleDesignation && !positions.some((p) => p.name === roleDesignation) && (
                  <option value={roleDesignation}>{roleDesignation}</option>
                )}
              </select>
              {onManagePositions && (
                <button type="button" className="bp-btn-sm" onClick={() => { onClose(); onManagePositions(); }}>Manage</button>
              )}
            </div>
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="eLocation">Location</label>
            <select id="eLocation" className="bp-field-input" value={locationId} onChange={(ev) => setLocationId(ev.target.value)} required>
              <option value="">Select a location…</option>
              {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <label className="bp-field-label" htmlFor="eSalary">Monthly salary (₹)</label>
        <input id="eSalary" type="number" min="0" step="0.01" className="bp-field-input" value={monthlySalary} onChange={(ev) => setMonthlySalary(ev.target.value)} required />

        <div className="bp-form-row">
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="eHire">Date of hire</label>
            <input id="eHire" type="date" className="bp-field-input" value={dateOfHire} onChange={(ev) => setDateOfHire(ev.target.value)} />
          </div>
          <div style={{ flex: 1 }}>
            <label className="bp-field-label" htmlFor="eEnd">End date (optional)</label>
            <input id="eEnd" type="date" className="bp-field-input" value={endDate} onChange={(ev) => setEndDate(ev.target.value)} />
          </div>
        </div>

        {isEdit && (
          <label className="bp-field-label" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={isActive} onChange={(ev) => setIsActive(ev.target.checked)} />
            Active
          </label>
        )}

        <div className="bp-form-actions">
          <button type="button" className="bp-btn-outline" onClick={onClose} disabled={submitting}>Cancel</button>
          <button type="submit" className="bp-btn-primary" disabled={submitting}>{submitting ? "Saving…" : isEdit ? "Save changes" : "Add employee"}</button>
        </div>
      </form>
    </Modal>
  );
}

