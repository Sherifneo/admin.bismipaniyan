export default function ComingSoon({ title }) {
  return (
    <div>
      <h1 style={{ margin: "0 0 8px", fontSize: 22, color: "var(--bp-brand)" }}>{title}</h1>
      <p style={{ margin: 0, color: "var(--bp-text-muted)", fontSize: 14 }}>
        This module hasn't been built yet — it's next up on the roadmap.
      </p>
    </div>
  );
}
