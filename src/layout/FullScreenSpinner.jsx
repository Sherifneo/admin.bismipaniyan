export default function FullScreenSpinner() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bp-bg)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          border: "3px solid var(--bp-border)",
          borderTopColor: "var(--bp-brand)",
          borderRadius: "50%",
          animation: "bp-spin 0.7s linear infinite",
        }}
      />
      <style>{`@keyframes bp-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
