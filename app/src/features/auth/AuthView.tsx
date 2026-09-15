import { useState } from "react";
import { db } from "@/services/storage";

interface AuthViewProps {
  onAuthed: () => void;
  onToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}

export function AuthView({ onAuthed, onToast }: AuthViewProps) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [err, setErr] = useState("");

  const handleSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const pass = String(fd.get("pass") || "");
    try {
      const s = db.load();
      const u = s.users.find((x) => x.email === email && x.pass === btoa(pass));
      if (!u) throw new Error("Credenciales incorrectas.");
      s.session = u.id; db.save(s);
      onToast("Sesión iniciada.", "success");
      onAuthed();
    } catch (er) {
      const msg = er instanceof Error ? er.message : String(er);
      setErr(msg);
    }
  };

  const handleSignUp = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const pass = String(fd.get("pass") || "");
    try {
      const s = db.load();
      if (s.users.some((u) => u.email === email)) throw new Error("Ese correo ya está registrado.");
      const user = { id: `u_${Date.now()}`, name, email, pass: btoa(pass), created: Date.now() };
      s.users.push(user); s.session = user.id; db.save(s);
      onToast("Cuenta creada en local. Bienvenido a Creeky.", "success");
      onAuthed();
    } catch (er) {
      const msg = er instanceof Error ? er.message : String(er);
      setErr(msg);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, background: "var(--bg-secondary)" }}>
      <div className="card" style={{ width: "100%", maxWidth: 440, padding: 28, borderRadius: 16 }}>
        <div style={{ display: "flex", background: "var(--bg-tertiary)", borderRadius: 999, padding: 4, marginBottom: 20 }}>
          <button onClick={() => { setMode("signin"); setErr(""); }} className="btn" style={{ flex: 1, borderRadius: 999, background: mode === "signin" ? "var(--bg-primary)" : "transparent", boxShadow: mode === "signin" ? "var(--shadow-sm)" : "none" }}>Sign In</button>
          <button onClick={() => { setMode("signup"); setErr(""); }} className="btn" style={{ flex: 1, borderRadius: 999, background: mode === "signup" ? "var(--bg-primary)" : "transparent", boxShadow: mode === "signup" ? "var(--shadow-sm)" : "none" }}>Sign Up</button>
        </div>
        <h2 style={{ textAlign: "center", marginBottom: 4 }}>{mode === "signin" ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h2>
        <p className="text-secondary" style={{ textAlign: "center", fontSize: 14, marginBottom: 20 }}>{mode === "signin" ? "Organiza tu día al estilo TickTick." : "Solo para tu uso personal. Sin servidores."}</p>
        {err ? <div className="auth-error" style={{ background: "rgba(198,40,40,.08)", border: "1px solid rgba(198,40,40,.25)", color: "#C62828", padding: "10px 12px", borderRadius: 8, fontSize: 13, marginBottom: 12 }}>{err}</div> : null}
        {mode === "signin" ? (
          <form onSubmit={handleSignIn} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label className="form-label">Correo<input className="form-input" name="email" type="email" required placeholder="tu@correo.com" /></label>
            <label className="form-label">Contraseña<input className="form-input" name="pass" type="password" required placeholder="••••••••" /></label>
            <button className="btn btn-primary" type="submit" style={{ width: "100%", marginTop: 8 }}>Entrar</button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <label className="form-label">Nombre<input className="form-input" name="name" type="text" required placeholder="Tu nombre" /></label>
            <label className="form-label">Correo<input className="form-input" name="email" type="email" required placeholder="tu@correo.com" /></label>
            <label className="form-label">Contraseña<input className="form-input" name="pass" type="password" required minLength={4} placeholder="Mínimo 4 caracteres" /></label>
            <button className="btn btn-primary" type="submit" style={{ width: "100%", marginTop: 8 }}>Crear cuenta</button>
          </form>
        )}
        <p className="text-sm" style={{ textAlign: "center", color: "var(--text-tertiary)", marginTop: 16 }}>Tus datos se guardan solo en este navegador (localStorage).</p>
      </div>
    </div>
  );
}
