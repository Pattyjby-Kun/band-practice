"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";
import PasswordField from "@/components/auth/PasswordField";
import PasswordStrengthIndicator from "@/components/auth/PasswordStrengthIndicator";
import GoogleAuthButton from "@/components/auth/GoogleAuthButton";
import { useAuth } from "@/components/AuthProvider";
import { useToast } from "@/components/ToastProvider";
import { BAND_ROLES, getOAuthRedirectUrl } from "@/lib/auth";
import { upsertMemberProfile } from "@/lib/members";

function RegisterForm() {
  const router = useRouter();
  const { supabase } = useAuth();
  const { showToast } = useToast();

  const [displayName, setDisplayName] = useState("");
  const [bandRole, setBandRole] = useState<string>(BAND_ROLES[0]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const passwordsMatch = password === confirmPassword;
  const showConfirmError = confirmPassword.length > 0 && !passwordsMatch;

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!agreedToTerms) {
      setError("You must agree to the Terms and Conditions");
      return;
    }

    if (!passwordsMatch) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            display_name: displayName.trim(),
            instrument: bandRole,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.session) {
        await upsertMemberProfile(supabase, {
          displayName: displayName.trim(),
          instrument: bandRole,
        });
        showToast("Account created successfully");
        router.push("/");
        router.refresh();
        return;
      }

      showToast("Account created successfully");
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    setError("");
    setGoogleLoading(true);

    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getOAuthRedirectUrl("/register?oauth=1"),
        },
      });

      if (oauthError) throw oauthError;
    } catch (err) {
      setGoogleLoading(false);
      setError(err instanceof Error ? err.message : "Google sign up failed");
    }
  }

  return (
    <AuthLayout
      title="Band Practice Manager"
      subtitle="Join your band workspace and start managing rehearsals."
      footer={
        <>
          Already have an account?{" "}
          <Link href="/login" className="text-primary-light hover:underline">
            Sign In
          </Link>
        </>
      }
    >
      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label htmlFor="band-role" className="mb-1.5 block text-sm font-medium text-foreground/80">
            Band Role
          </label>
          <select
            id="band-role"
            value={bandRole}
            onChange={(e) => setBandRole(e.target.value)}
            className="input-field"
            required
          >
            {BAND_ROLES.map((role) => (
              <option key={role} value={role} className="bg-background text-foreground">
                {role}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="display-name" className="mb-1.5 block text-sm font-medium text-foreground/80">
            Display Name
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="input-field"
            placeholder="Your stage name"
            required
            autoComplete="name"
          />
        </div>

        <div>
          <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-foreground/80">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-field"
            placeholder="you@band.com"
            required
            autoComplete="email"
          />
        </div>

        <div>
          <PasswordField
            id="password"
            label="Password"
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
            minLength={6}
          />
          <PasswordStrengthIndicator password={password} />
        </div>

        <div>
          <PasswordField
            id="confirm-password"
            label="Confirm Password"
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            minLength={6}
          />
          {showConfirmError && (
            <p className="mt-1.5 text-sm text-red-400">Passwords do not match</p>
          )}
        </div>

        <label className="flex items-start gap-3 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={agreedToTerms}
            onChange={(e) => setAgreedToTerms(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-white/20 bg-muted/50 accent-primary"
          />
          <span>I agree to the Terms and Conditions</span>
        </label>

        {error && (
          <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || showConfirmError}
          className="btn-primary w-full"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create Account"
          )}
        </button>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-transparent px-2 text-muted-foreground/60">or</span>
          </div>
        </div>

        <GoogleAuthButton
          label="Sign Up with Google"
          onClick={handleGoogleSignUp}
          loading={googleLoading}
        />
      </form>
    </AuthLayout>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary-light" />
        </main>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
