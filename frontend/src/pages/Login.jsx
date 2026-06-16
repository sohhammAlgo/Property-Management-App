import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { loginWithEmail, loginWithGoogle, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const navigate = useNavigate();

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate('/dashboard');
    } catch {
      // error is shown via context
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      await loginWithGoogle();
      navigate('/dashboard');
    } catch {
      // error shown via context
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <main className="flex h-screen overflow-hidden bg-background">
      {/* Left: Branding Panel */}
      <section className="relative hidden md:flex md:w-1/2 h-full overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=1200&auto=format&fit=crop"
          alt="Modern luxury apartment complex"
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Overlay */}
        <div className="relative z-10 w-full h-full flex flex-col justify-between p-xl bg-primary/25 backdrop-blur-sm">
          {/* Logo */}
          <div className="flex items-center gap-sm">
            <span className="material-symbols-outlined text-white text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              corporate_fare
            </span>
            <h1 className="text-3xl font-bold text-white tracking-tight">SocietyPro AI</h1>
          </div>

          {/* Bottom panel */}
          <div className="max-w-md space-y-md">
            <div className="bg-white/10 backdrop-blur-md p-md rounded-xl border border-white/20">
              <div className="flex items-center gap-xs mb-xs">
                <span className="material-symbols-outlined text-secondary-fixed text-sm">auto_awesome</span>
                <span className="text-label-caps text-secondary-fixed uppercase tracking-widest">Smart Insights</span>
              </div>
              <p className="text-white text-body-lg leading-relaxed">
                Manage your property ecosystem with precision AI. From automated maintenance logs to
                resident analytics, everything is under control.
              </p>
            </div>

            {/* Stats */}
            <div className="flex gap-xl">
              <div className="text-white">
                <div className="text-3xl font-bold">2.4k</div>
                <div className="text-label-caps opacity-80 uppercase tracking-widest">Societies Managed</div>
              </div>
              <div className="w-px h-12 bg-white/30" />
              <div className="text-white">
                <div className="text-3xl font-bold">99.9%</div>
                <div className="text-label-caps opacity-80 uppercase tracking-widest">Uptime Reliability</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Right: Login Form */}
      <section className="w-full md:w-1/2 flex flex-col justify-center items-center p-md bg-surface overflow-y-auto">
        <div className="w-full max-w-md space-y-xl">
          {/* Mobile logo */}
          <div className="flex items-center gap-xs md:hidden justify-center">
            <span className="material-symbols-outlined text-primary text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              corporate_fare
            </span>
            <span className="text-2xl font-bold text-primary">SocietyPro AI</span>
          </div>

          {/* Header */}
          <div>
            <h2 className="text-h2 text-on-surface font-bold">Welcome back</h2>
            <p className="text-body-sm text-on-surface-variant mt-xs">
              Log in to your management portal to continue.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-error-container text-on-error-container px-md py-sm rounded-lg text-body-sm flex items-center gap-xs">
              <span className="material-symbols-outlined text-sm">error</span>
              {error}
            </div>
          )}

          {/* Form Card */}
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-card p-lg space-y-md">
            <form onSubmit={handleEmailLogin} className="space-y-md">
              {/* Email */}
              <div className="space-y-xs">
                <label htmlFor="email" className="text-label-caps text-on-surface-variant uppercase tracking-wider">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@society.pro"
                  className="input"
                />
              </div>

              {/* Password */}
              <div className="space-y-xs">
                <div className="flex justify-between items-center">
                  <label htmlFor="password" className="text-label-caps text-on-surface-variant uppercase tracking-wider">
                    Password
                  </label>
                  <a href="#" className="text-label-caps text-secondary hover:underline">
                    Forgot Password?
                  </a>
                </div>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input"
                />
              </div>

              {/* Remember me */}
              <div className="flex items-center gap-xs">
                <input id="remember" type="checkbox" className="w-4 h-4 text-primary border-outline-variant rounded cursor-pointer" />
                <label htmlFor="remember" className="text-body-sm text-on-surface-variant cursor-pointer select-none">
                  Remember Me
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary flex justify-center items-center gap-sm"
              >
                {loading ? (
                  <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                ) : null}
                {loading ? 'Signing in...' : 'Login to Dashboard'}
                {!loading && <span className="material-symbols-outlined text-sm">arrow_forward</span>}
              </button>
            </form>

            {/* Divider */}
            <div className="relative py-sm">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-outline-variant" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-surface-container-lowest px-md text-label-caps text-on-surface-variant uppercase">
                  Or continue with
                </span>
              </div>
            </div>

            {/* Google Login */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={googleLoading}
              className="w-full flex items-center justify-center gap-sm px-md py-sm border border-outline-variant rounded-lg hover:bg-surface-container-low transition-all active:scale-[0.98]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              <span className="text-body-sm font-semibold text-on-surface">
                {googleLoading ? 'Signing in...' : 'Sign in with Google'}
              </span>
            </button>
          </div>

          {/* Footer CTA */}
          <div className="pt-md">
            <p className="text-body-sm text-on-surface-variant mb-xs">New to SocietyPro AI?</p>
            <a href="#" className="inline-flex items-center gap-xs font-semibold text-secondary hover:text-primary transition-colors group">
              Onboard your Society
              <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">launch</span>
            </a>
          </div>
        </div>

        {/* AI Pro Tip */}
        <div className="fixed bottom-lg right-lg hidden lg:block max-w-xs">
          <div className="ai-accent-border p-sm rounded-xl shadow-modal backdrop-blur-md">
            <div className="flex items-start gap-sm">
              <div className="p-xs bg-primary-container rounded-lg flex-shrink-0">
                <span className="material-symbols-outlined text-on-primary-container" style={{ fontVariationSettings: "'FILL' 1" }}>
                  auto_awesome
                </span>
              </div>
              <div>
                <h4 className="text-label-caps text-primary font-bold">Pro Tip</h4>
                <p className="text-[12px] text-on-surface-variant leading-snug mt-1">
                  Use your corporate SSO credentials for instant access to the Analytics dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
