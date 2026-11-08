import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "/dashboard" } = await searchParams;
  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 style={{ textAlign: "center" }}>Riachuelo NFC</h1>
        <p className="muted" style={{ textAlign: "center", marginTop: 0 }}>Acesso restrito à administração</p>
        <LoginForm next={next} />
      </div>
    </div>
  );
}
