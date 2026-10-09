import { useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { CinematicThemeSwitcher } from "@/components/ui/CinematicThemeSwitcher";
import { LoginBackground } from "@/features/auth/LoginBackground";
import { useTheme } from "@/hooks/useTheme";
import type { Theme } from "@/hooks/useTheme";
import { db } from "@/services/storage";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { evaluatePassword, isPasswordValid } from "@/features/auth/passwordRules";
import { cn } from "@/lib/utils";

interface AuthViewProps {
  onAuthed: () => void;
  onToast: (msg: string, type?: "info" | "success" | "warning" | "error") => void;
}

/**
 * Ball colors per theme, drawn from the Creeky palette.
 */
const BALLPIT_COLORS: Record<Theme, number[]> = {
  light: [0x8060b3, 0x98c91c, 0xe0e0e0, 0x5e468a, 0xffffff],
  dark: [0x5e468a, 0x668f00, 0x2a2a3e, 0x8060b3, 0x0a0a0f],
};

/**
 * Authentication view with themed Ballpit background and guided signup.
 */
export function AuthView({ onAuthed, onToast }: AuthViewProps) {
  const { theme, toggleTheme } = useTheme();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [err, setErr] = useState("");
  const [signupPass, setSignupPass] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");

  const ruleResults = useMemo(() => evaluatePassword(signupPass), [signupPass]);
  const passwordsMatch = signupConfirm.length > 0 && signupConfirm === signupPass;

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
    try {
      if (!isPasswordValid(signupPass)) throw new Error("La contraseña no cumple todos los requisitos.");
      if (signupPass !== signupConfirm) throw new Error("Las contraseñas no coinciden.");
      const s = db.load();
      if (s.users.some((u) => u.email === email)) throw new Error("Ese correo ya está registrado.");
      const user = { id: `u_${Date.now()}`, name, email, pass: btoa(signupPass), created: Date.now() };
      s.users.push(user);
      s.session = user.id;
      db.save(s);
      onToast("Cuenta creada en local. Bienvenido a Creeky.", "success");
      onAuthed();
    } catch (er) {
      setErr(er instanceof Error ? er.message : String(er));
    }
  };

  const switchMode = (next: "signin" | "signup") => {
    setMode(next);
    setErr("");
  };

  return (
    <div className="relative flex h-full w-full flex-1 min-h-0 items-center justify-center overflow-hidden bg-(--bg-secondary) p-6">
      <div aria-hidden className="absolute inset-0">
        <LoginBackground colors={BALLPIT_COLORS[theme]} />
      </div>
      <div className="absolute right-4 top-4 z-20">
        <CinematicThemeSwitcher theme={theme} onToggle={toggleTheme} />
      </div>
      <div className="relative z-10 w-full max-w-110 rounded-2xl border border-(--accent-border) bg-(--bg-primary)/70 p-7 backdrop-blur-2xl shadow-[0_24px_60px_-12px_var(--accent-border),0_4px_16px_rgba(0,0,0,0.06)]">
        <div className="mb-5 flex rounded-full bg-(--accent-light) p-1 backdrop-blur dark:bg-white/10">
          <button onClick={() => switchMode("signin")} className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${mode === "signin" ? "bg-white/85 text-(--text) shadow dark:bg-white/20" : "text-(--muted) hover:text-(--text)"}`}>Sign In</button>
          <button onClick={() => switchMode("signup")} className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition-colors ${mode === "signup" ? "bg-white/85 text-(--text) shadow dark:bg-white/20" : "text-(--muted) hover:text-(--text)"}`}>Sign Up</button>
        </div>
        <h2 className="bg-gradient-to-r from-(--accent) to-(--secondary) bg-clip-text text-center text-xl font-semibold text-transparent">{mode === "signin" ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h2>
        <p className="mb-5 mt-1 text-center text-sm text-(--muted)">{mode === "signin" ? "Organiza tu día al estilo TickTick." : "Solo para tu uso personal. Sin servidores."}</p>
        {err ? <div className="mb-3 rounded-lg border border-[rgba(198,40,40,0.25)] bg-[rgba(198,40,40,0.08)] px-3 py-2.5 text-sm text-[#C62828]">{err}</div> : null}
        {mode === "signin" ? (
          <form onSubmit={handleSignIn} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">Correo<Input name="email" type="email" required placeholder="tu@correo.com" glass /></label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">Contraseña<Input name="pass" type="password" required placeholder="••••••••" glass /></label>
            <Button type="submit" variant="gradient" block className="mt-2">Entrar</Button>
          </form>
        ) : (
          <form onSubmit={handleSignUp} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">Nombre<Input name="name" type="text" required placeholder="Tu nombre" glass /></label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">Correo<Input name="email" type="email" required placeholder="tu@correo.com" glass /></label>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">Contraseña<Input name="signup-pass" type="password" required value={signupPass} onChange={(e) => setSignupPass(e.target.value)} placeholder="8–15 caracteres con mayúscula, número y símbolo" autoComplete="new-password" glass /></label>
            <ul aria-live="polite" className="flex flex-col gap-1 rounded-lg border border-(--accent-border) bg-white/60 px-3 py-2.5 backdrop-blur dark:border-white/10 dark:bg-white/5">
              {ruleResults.map(({ rule, passed }) => (
                <li key={rule.id} className={cn("flex items-center gap-2 text-xs", passed ? "text-(--secondary) font-medium" : "text-(--muted)")}>
                  <span aria-hidden className={cn("flex h-4 w-4 items-center justify-center rounded-full border", passed ? "border-(--secondary) bg-(--secondary-light)" : "border-(--border-medium)")}>
                    {passed ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  </span>
                  {rule.label}
                  <span className="sr-only">{passed ? "cumplido" : "pendiente"}</span>
                </li>
              ))}
              <li className={cn("flex items-center gap-2 text-xs", passwordsMatch ? "text-(--secondary) font-medium" : "text-(--muted)")}>
                <span aria-hidden className={cn("flex h-4 w-4 items-center justify-center rounded-full border", passwordsMatch ? "border-(--secondary) bg-(--secondary-light)" : "border-(--border-medium)")}>
                  {passwordsMatch ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                </span>
                Ambas contraseñas coinciden
                <span className="sr-only">{passwordsMatch ? "cumplido" : "pendiente"}</span>
              </li>
            </ul>
            <label className="flex flex-col gap-1.5 text-xs font-medium text-(--text-soft)">Repetir contraseña<Input name="signup-confirm" type="password" required value={signupConfirm} onChange={(e) => setSignupConfirm(e.target.value)} placeholder="Escríbela de nuevo" autoComplete="new-password" glass /></label>
            <Button type="submit" variant="gradient" block className="mt-2">Crear cuenta</Button>
          </form>
        )}
        <p className="mt-4 text-center text-xs text-(--muted)">Tus datos se guardan solo en tu equipo :)</p>
      </div>
    </div>
  );
}
