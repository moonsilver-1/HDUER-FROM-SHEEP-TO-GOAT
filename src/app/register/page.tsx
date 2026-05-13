import Link from "next/link";
import { RegisterForm } from "@/components/auth-forms";

export const metadata = {
  title: "注册 | HDU Wiki"
};

export default function RegisterPage() {
  return (
    <main className="auth-page">
      <Link className="back-link" href="/">
        返回首页
      </Link>
      <section className="minimal-auth-card">
        <h1>注册</h1>
        <RegisterForm />
      </section>
    </main>
  );
}
