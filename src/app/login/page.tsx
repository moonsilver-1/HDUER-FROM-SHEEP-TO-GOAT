import Link from "next/link";
import { LoginForm } from "@/components/auth-forms";

export const metadata = {
  title: "登录 | HDU Wiki"
};

export default function LoginPage() {
  return (
    <main className="auth-page">
      <Link className="back-link" href="/">
        返回首页
      </Link>
      <section className="minimal-auth-card">
        <h1>登录</h1>
        <LoginForm />
      </section>
    </main>
  );
}
