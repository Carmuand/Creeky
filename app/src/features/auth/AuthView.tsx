import { useState } from "react";
import { db } from "@/services/storage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

interface AuthViewProps {
  onAuthed: () => void;
  onToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}

/**
 * Authentication view with Tailwind styling.
 */
export function AuthView({ onAuthed, onToast }: AuthViewProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [err, setErr] = useState("");

  const handleSignIn = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const pass = String(fd.get("pass") || "");
    try {
      const s = db.load();
      const u = s.users.find((x) => x.email === email && x.pass === btoa(pass));
      if (!u) throw new Error("Credenciales incorrectas.");
      s.session = u.id;
      db.save(s);
      onToast("Sesión iniciada.", "success");
      onAuthed();
    } catch (er) {
      setErr(er instanceof Error ? er.message : String(er));
    }
  };

  const handleSignUp = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const pass = String(fd.get("pass") || "");
    try {
      const s = db.load();
      if (s.users.some((u) => u.email === email)) throw new Error("Ese correo ya está registrado.");
      const user = { id: `u_${Date.now()}`, name, email, pass: btoa(pass), created: Date.now() };
      s.users.push(user);
      s.session = user.id;
      db.save(s);
      onToast("Cuenta creada en local. Bienvenido a Creeky.", "success");
      onAuthed();
    } catch (er) {
      setErr(er instanceof Error ? er.message : String(er));
    }
  };

  return (
    <div className="flex h-full min-h-0 items-center justify-center bg-(--bg-secondary) p-6">
      <div className="w-full max-w-110 rounded-2xl border border-(--border-light) bg-(--bg-primary) p-7 shadow-sm">
        <div className="mb-5 flex rounded-full bg-(--bg-tertiary) p-1">
          <button onClick={() => { setMode("signin"); setErr(""); }} className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${mode === "signin" ? "bg-(--bg-primary) shadow-sm text-(--text)" : "text-(--muted) hover:text-(--text)"}`}>Sign In</button>
          <button onClick={() => { setMode("signup"); setErr(""); }} className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${mode === "signup" ? "bg-(--bg-primary) shadow-sm text-(--text)" : "text-(--muted) hover:text-(--text)"}`}>Sign Up</button>
        </div>
        <h2 className="text-center text-xl font-semibold">{mode === "signin" ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h2>
        <p className="mb-5 mt-1 text-center text-sm text-(--muted)">{mode === "signin" ? "Organiza tu día al estilo TickTick." : "Solo para tu uso personal. Sin servidores."}</p>
        {err ? <div className="mb-3 rounded-lg border border-[rgba(198,40,40,0.25)] bg-[rgba(198,40,40,0.08)] px-3 py-2.5 text-sm text-[#C62828]">{err}</div> : null}
        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">Correo<Input name="email" type="email" required placeholder="tu@correo.com" /></label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">Contraseña<Input name="pass" type="password" required placeholder="••••••••" /></label>
            <Button type="submit" variant="primary" block className="mt-2">Entrar</Button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">Nombre<Input name="name" type="text" required placeholder="Tu nombre" /></label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">Correo<Input name="email" type="email" required placeholder="tu@correo.com" /></label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">Contraseña<Input name="pass" type="password" required minLength={4} placeholder="Mínimo 4 caracteres" /></label>
            <Button type="submit" variant="primary" block className="mt-2">Crear cuenta</Button>
          </form>
        )}
        <p className="mt-4 text-center text-xs text-(--muted)">Tus datos se guardan solo en tu equipo :)</p>
      </div>
    </div>
  );
}
