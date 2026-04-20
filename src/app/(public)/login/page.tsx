import { redirect } from "next/navigation";
import { getOptionalSession } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { Share2 } from "lucide-react";

export default async function LoginPage() {
  const session = await getOptionalSession();
  if (session) redirect("/");

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-teal-700 rounded-lg flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-slate-900">Content Hub</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <h1 className="text-lg font-semibold text-slate-900 mb-1">Inloggen</h1>
          <p className="text-sm text-slate-500 mb-6">Log in op je werkruimte.</p>

          <LoginForm />
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          De Leo Media &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
