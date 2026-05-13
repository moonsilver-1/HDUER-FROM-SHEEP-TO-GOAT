import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { logoutFormAction } from "@/app/auth/actions";

export async function AccountNav() {
  const session = await getCurrentSession();

  return (
    <div className="account-nav">
      {session ? (
        <details className="account-menu">
          <summary>{session.username}</summary>
          <div className="account-dropdown">
            <Link href="/profile">个人主页</Link>
            <Link href="/contribute">投稿</Link>
            <form action={logoutFormAction}>
              <button type="submit">退出登录</button>
            </form>
          </div>
        </details>
      ) : (
        <Link className="account-login-link" href="/login">
          登录
        </Link>
      )}
    </div>
  );
}
