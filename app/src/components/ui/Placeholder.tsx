interface PlaceholderProps {
  title: string;
  description?: string;
  icon?: string;
}

export function Placeholder({ title, description, icon = "🚧" }: PlaceholderProps) {
  return (
    <section className="page">
      <div className="card card-pad" style={{ textAlign: "center", padding: "40px 24px" }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>{icon}</div>
        <h2 style={{ marginBottom: 8 }}>{title}</h2>
        <p className="text-secondary" style={{ maxWidth: 520, margin: "0 auto" }}>
          {description ?? "Esta sección está en migración a React + TS. La lógica vanilla de app/src/js/pages.js se portará aquí por feature."}
        </p>
        <p className="text-xs" style={{ marginTop: 12, color: "var(--text-tertiary)" }}>
          Próximo paso: extraer template de `P.${title}Page` a este componente y conectar `useCreekyStore`.
        </p>
      </div>
    </section>
  );
}
