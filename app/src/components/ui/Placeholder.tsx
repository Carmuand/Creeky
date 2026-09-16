interface PlaceholderProps {
  title: string;
  description?: string;
  icon?: string;
}

export function Placeholder({ title, description, icon = "🚧" }: PlaceholderProps) {
  return (
    <section className="max-w-275 mx-auto">
      <div className="rounded-xl border border-(--border-light) bg-(--bg-primary) p-10 text-center shadow-sm">
        <div className="mb-3 text-3xl">{icon}</div>
        <h2 className="mb-2 text-xl font-semibold">{title}</h2>
        <p className="mx-auto max-w-130 text-sm text-(--muted)">
          {description ?? "Hola desde el placeholder :)"}
        </p>
        <p className="mt-3 text-xs text-(--muted)">
          Próximo paso: extraer template de `P.${title}Page` a este componente y conectar `useCreekyStore`.
        </p>
      </div>
    </section>
  );
}