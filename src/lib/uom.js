export const UOM_LABELS = { each: "Each", kg: "KG" };

// Each -> whole-number display, no decimals. KG -> up to 2 decimals with
// a unit suffix, since a kg-based item's quantity is usually fractional.
export function formatQty(qty, uom) {
  const n = Number(qty || 0);
  if (uom === "kg") {
    return `${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg`;
  }
  return Math.round(n).toLocaleString("en-IN");
}

// step/min for a quantity <input type="number"> — whole units for
// 'each', two-decimal precision for 'kg'.
export function qtyInputStep(uom) {
  return uom === "kg" ? "0.01" : "1";
}
