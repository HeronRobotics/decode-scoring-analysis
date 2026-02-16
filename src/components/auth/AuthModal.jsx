import { useState } from "react";
import { GithubLogo } from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext.jsx";

function GoogleMark() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="-3 0 262 262"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="xMidYMid"
    >
      <path
        d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622 38.755 30.023 2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"
        fill="#4285F4"
      />
      <path
        d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055-34.523 0-63.824-22.773-74.269-54.25l-1.531.13-40.298 31.187-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"
        fill="#34A853"
      />
      <path
        d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82 0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602l42.356-32.782"
        fill="#FBBC05"
      />
      <path
        d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0 79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"
        fill="#EB4335"
      />
    </svg>
  );
}

function AuthModal({ open, onClose, defaultMode = "signin", onAuthSuccess }) {
  const { signIn, signUp, signInWithGitHub, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const fn = mode === "signin" ? signIn : signUp;
      const { error: authError } = await fn({ email, password });
      if (authError) {
        setError(authError.message || "Authentication failed");
        setLoading(false);
        return;
      }

      if (mode === "signup") {
        alert(
          "Check your email for a confirmation link to finish creating your account. (It might be in your spam folder!)",
        );
      }

      if (onAuthSuccess) {
        onAuthSuccess();
      }
      onClose();
    } catch (err) {
      setError(err.message || "Authentication failed");
      setLoading(false);
    }
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
  };

  const handleGitHubSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const { error: authError } = await signInWithGitHub();
      if (authError) {
        setError(authError.message || "GitHub sign-in failed");
        setLoading(false);
      }
      // On success, Supabase will redirect the user and auth state will update.
    } catch (err) {
      setError(err.message || "GitHub sign-in failed");
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    try {
      const { error: authError } = await signInWithGoogle();
      if (authError) {
        setError(authError.message || "Google sign-in failed");
        setLoading(false);
      }
      // On success, Supabase will redirect the user and auth state will update.
    } catch (err) {
      setError(err.message || "Google sign-in failed");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed w-screen h-screen inset-0 bg-brand-bg/90 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-brand-surface p-4 sm:p-8 max-w-md w-11/12 border-2 border-brand-border shadow-2xl shadow-brand-shadow rounded-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl mb-5 text-center">
          {mode === "signin" ? "Sign In" : "Create Account"}
        </h3>

        <div className="flex mb-4 border-b border-brand-border">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`flex-1 py-2 text-sm rounded-none! border-b-2 font-semibold ${
              mode === "signin"
                ? "border-brand-accent text-brand-accent"
                : "border-brand-bg text-brand-text"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 py-2 text-sm rounded-none! border-b-2 font-semibold ${
              mode === "signup"
                ? "border-brand-accent text-brand-accent"
                : "border-brand-bg text-brand-text"
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="mb-3 text-sm text-brand-accent">{error}</div>}

        <div className="flex flex-col gap-3 mb-4 items-center">
          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="btn w-fit !bg-brand-white !text-white hover:!bg-brand-accentBg flex items-center justify-center gap-2 !border-1 !border-white"
            disabled={loading}
          >
            <GoogleMark />
            <span>Continue with Google</span>
          </button>
          <button
            type="button"
            onClick={handleGitHubSignIn}
            className="btn w-fit !bg-brand-white !text-white hover:!bg-brand-accentBg flex items-center justify-center gap-2 !border-1 !border-white"
            disabled={loading}
          >
            <GithubLogo weight="fill" size={18} />
            <span>Continue with GitHub</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-brand-text">
            <div className="flex-1 h-px bg-brand-border" />
            <span>or</span>
            <div className="flex-1 h-px bg-brand-border" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            Email
            <input
              type="email"
              placeholder="Your team email here"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border-2 border-brand-border focus:border-brand-accent outline-none"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border-2 border-brand-border focus:border-brand-accent outline-none"
              required
            />
          </label>
          <div className="flex gap-4 justify-end mt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn bg-brand-surface!"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn !bg-brand-accent !text-over-accent"
              disabled={loading}
            >
              {loading
                ? mode === "signin"
                  ? "Signing in..."
                  : "Signing up..."
                : mode === "signin"
                  ? "Sign In"
                  : "Sign Up"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default AuthModal;
