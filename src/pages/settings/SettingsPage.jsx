import { useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { NAV_ITEMS } from "../../layout/navConfig";
import CompanyDetailsTab from "./CompanyDetailsTab";
import {
  getStoredOrder,
  setStoredOrder,
  getStoredFavorites,
  setStoredFavorites,
  clearSidebarPrefs,
  sortNavItems,
} from "../../layout/sidebarPrefs";

// Settings holds sidebar customization (drag-reorder + favorites) plus
// (owner-only) Company Details — Bismi's legal/statutory identity used
// on invoices. Change-password and theme/design personalization moved
// to the Profile page (reached via the header avatar), since those are
// personal-identity actions, not app-wide settings.
const TABS = [
  { key: "sidebar", label: "Sidebar" },
  { key: "company", label: "Company Details" },
];

export default function SettingsPage() {
  const { admin } = useAuth();
  const [tab, setTab] = useState("sidebar");
  const visibleTabs = TABS.filter((t) => t.key !== "company" || admin?.role === "owner");

  return (
    <div>
      <h1 className="bp-page-title">Settings</h1>
      <div className="bp-tabs" style={{ marginBottom: 16 }}>
        {visibleTabs.map((t) => (
          <button
            key={t.key}
            type="button"
            className={`bp-tab${tab === t.key ? " is-active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "sidebar" && <SidebarCustomizer />}
      {tab === "company" && admin?.role === "owner" && <CompanyDetailsTab />}
    </div>
  );
}

// Reuses the exact same visibility rules Sidebar.jsx applies (ownerOnly /
// requiredPermission), so this list matches what the admin can actually
// see. Dashboard is excluded — it's fixed first in the sidebar, not
// draggable or favoritable.
function SidebarCustomizer() {
  const { admin, hasPermission } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.key === "dashboard") return false;
    if (item.ownerOnly && admin?.role !== "owner") return false;
    if (item.requiredPermission && !hasPermission(item.requiredPermission)) return false;
    return true;
  });

  const [order, setOrder] = useState(() => getStoredOrder());
  const [favorites, setFavorites] = useState(() => getStoredFavorites());
  const [dragKey, setDragKey] = useState(null);

  const displayItems = sortNavItems(visibleItems, order, favorites);

  function persistOrder(items) {
    const keys = items.map((item) => item.key);
    setOrder(keys);
    setStoredOrder(keys);
  }

  function toggleFavorite(key) {
    setFavorites((prev) => {
      const next = prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key];
      setStoredFavorites(next);
      return next;
    });
  }

  function onDragStart(key) {
    setDragKey(key);
  }

  function onDragOver(e) {
    e.preventDefault();
  }

  function onDrop(targetKey) {
    if (!dragKey || dragKey === targetKey) {
      setDragKey(null);
      return;
    }
    const current = displayItems.map((item) => item.key);
    const fromIdx = current.indexOf(dragKey);
    const toIdx = current.indexOf(targetKey);
    if (fromIdx === -1 || toIdx === -1) {
      setDragKey(null);
      return;
    }
    const reordered = [...current];
    reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, dragKey);
    // Persist as one combined order — sortNavItems still separates
    // favorited/non-favorited groups on render, so the stored order only
    // needs to reflect relative position within each group.
    persistOrder(reordered.map((key) => visibleItems.find((item) => item.key === key)).filter(Boolean));
    setDragKey(null);
  }

  function resetToDefault() {
    clearSidebarPrefs();
    setOrder([]);
    setFavorites([]);
  }

  return (
    <div className="bp-table-wrap" style={{ padding: 20, maxWidth: 480 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <h2 style={{ fontSize: 15, margin: 0 }}>Customize your sidebar</h2>
        <button type="button" className="bp-btn-sm" onClick={resetToDefault}>Reset to default</button>
      </div>
      <p className="bp-td-muted" style={{ marginTop: 0, marginBottom: 14 }}>
        Drag to reorder, or star an item to pin it to the top. Dashboard always stays first.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {displayItems.map((item) => {
          const isFavorited = favorites.includes(item.key);
          return (
            <div
              key={item.key}
              draggable
              onDragStart={() => onDragStart(item.key)}
              onDragOver={onDragOver}
              onDrop={() => onDrop(item.key)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                borderRadius: "var(--bp-radius-sm)",
                border: "1px solid var(--bp-border)",
                background: dragKey === item.key ? "var(--bp-glass-row-hover)" : "transparent",
                cursor: "grab",
              }}
            >
              <span aria-hidden="true" style={{ opacity: 0.5, fontSize: 12 }}>⠿</span>
              <span aria-hidden="true">{item.icon}</span>
              <span style={{ flex: 1, fontSize: 13 }}>{item.label}</span>
              <button
                type="button"
                onClick={() => toggleFavorite(item.key)}
                aria-label={isFavorited ? `Unfavorite ${item.label}` : `Favorite ${item.label}`}
                title={isFavorited ? "Unfavorite" : "Favorite"}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  fontSize: 15,
                  color: isFavorited ? "var(--bp-amber)" : "var(--bp-text-muted)",
                  padding: 2,
                  lineHeight: 1,
                }}
              >
                ★
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
