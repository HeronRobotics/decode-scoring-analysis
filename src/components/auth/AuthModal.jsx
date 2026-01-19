import { useState } from "react";
import { GithubLogo } from "@phosphor-icons/react";
import { useAuth } from "../../contexts/AuthContext.jsx";

function AuthModal({ open, onClose, defaultMode = "signin", onAuthSuccess }) {
  const { signIn, signUp, signInWithGitHub } = useAuth();
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
          "Check your email for a confirmation link to finish creating your account.",
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

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-white p-4 sm:p-8 max-w-md w-11/12 border-2 border-[#445f8b]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-2xl mb-5 text-center">
          {mode === "signin" ? "Sign In" : "Create Account"}
        </h3>

        <div className="flex mb-4 border-b border-[#ddd]">
          <button
            type="button"
            onClick={() => switchMode("signin")}
            className={`flex-1 py-2 text-sm font-semibold ${
              mode === "signin"
                ? "border-b-2 border-[#445f8b] text-[#445f8b]"
                : "text-[#666]"
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => switchMode("signup")}
            className={`flex-1 py-2 text-sm font-semibold ${
              mode === "signup"
                ? "border-b-2 border-[#445f8b] text-[#445f8b]"
                : "text-[#666]"
            }`}
          >
            Sign Up
          </button>
        </div>

        {error && <div className="mb-3 text-sm text-red-600">{error}</div>}

        <div className="flex flex-col gap-3 mb-4 items-center">
          <button
            type="button"
            onClick={handleGitHubSignIn}
            className="btn w-fit !bg-white !text-black hover:!bg-[#eee] flex items-center justify-center gap-2 !border-2 !border-black"
            disabled={loading}
          >
            <GithubLogo weight="fill" size={18} />
            <span>Continue with GitHub</span>
          </button>
          <div className="flex items-center gap-2 text-xs text-[#666]">
            <div className="flex-1 h-px bg-[#ddd]" />
            <span>or</span>
            <div className="flex-1 h-px bg-[#ddd]" />
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
              className="w-full p-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none"
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border-2 border-[#ddd] focus:border-[#445f8b] outline-none"
              required
            />
          </label>
          <div className="flex gap-4 justify-end mt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn !bg-[#445f8b] !text-white"
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
