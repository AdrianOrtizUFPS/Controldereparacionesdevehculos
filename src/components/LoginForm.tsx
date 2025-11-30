import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { login } from '@/utils/api';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';
import { Mail, Lock, Heart, Eye, EyeOff } from 'lucide-react';

type Props = {
  onSuccess: () => void;
};

export function LoginForm({ onSuccess }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);

  useEffect(() => {
    // Prefill email if remembered
    const saved = localStorage.getItem('crv_remember_email');
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email.trim(), password);
      // Simple "remember me" hint for future improvements
      if (remember) {
        localStorage.setItem('crv_remember_email', email.trim());
      } else {
        localStorage.removeItem('crv_remember_email');
      }
      onSuccess();
    } catch (e: any) {
      setError(e.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen login-hero flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
        {/* Decorative/brand panel (hidden on small screens) */}
        <div className="hidden lg:block">
          <div className="h-full w-full rounded-2xl shadow-xl overflow-hidden border border-border/60 bg-white/60 backdrop-blur">
            <div className="h-full p-8 flex flex-col justify-between">
              <div>
                <div className="w-fit px-3 py-1 rounded-full text-xs bg-primary/10 text-primary mb-4">Bienvenido</div>
                <h2 className="text-2xl font-semibold tracking-tight mb-2">Sistema de Reparaciones</h2>
                <p className="text-sm text-muted-foreground">Gestione clientes, vehículos y reparaciones con un flujo ágil y seguro.</p>
              </div>
              <div className="text-xs text-muted-foreground mt-6">© {new Date().getFullYear()} Tu Taller. Todos los derechos reservados.</div>
            </div>
          </div>
        </div>

        {/* Login Card */}
        <div className="w-full max-w-md mx-auto">
          <Card className="border border-border/60 shadow-2xl rounded-3xl backdrop-blur-sm">
            <CardHeader className="pb-0 text-center space-y-1">
              <CardTitle className="text-2xl">Login</CardTitle>
              <CardDescription>Ingresa tus credenciales para continuar</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 pb-6 px-6">
              <form onSubmit={onSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="tu@correo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="pl-10 h-10"
                      autoComplete="email"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Contraseña</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyUp={(e) => setCapsLockOn((e as any).getModifierState && (e as any).getModifierState('CapsLock'))}
                      required
                      className="pl-10 pr-10 h-10"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => setShowPassword((s) => !s)}
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                  {capsLockOn && (
                    <div className="text-xs text-muted-foreground mt-1">Bloq Mayús activado</div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(Boolean(v))} />
                    <Label htmlFor="remember" className="text-sm text-muted-foreground">Recordarme</Label>
                  </div>
                  <a href="#" className="text-sm text-primary hover:underline">¿Olvidaste tu contraseña?</a>
                </div>

                {error && <div className="text-sm text-red-600 mt-1">{error}</div>}

                <Button type="submit" className="w-full h-11 rounded-full" disabled={loading}>
                  {loading ? 'Ingresando…' : 'Ingresar'}
                </Button>

                <div className="text-xs text-center text-muted-foreground mt-1">
                  Hecho con <Heart className="inline-block mx-1 size-3 text-rose-500" /> por Balance Hype Squad
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
