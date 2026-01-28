import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, Mail, Lock, Spade, Diamond, Club, Heart } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { useAuthStore } from '../store/authStore';

// Schema de validación
const loginSchema = z.object({
  email: z.string().email('Email inválido').min(1, 'Email requerido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError, isAuthenticated } = useAuthStore();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const onSubmit = async (data: LoginForm) => {
    const success = await login(data.email, data.password);
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background con patrón y efectos */}
      <div className="absolute inset-0 bg-midnight">
        {/* Gradientes de fondo */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.1),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(212,175,55,0.08),transparent_50%)]" />
        
        {/* Patrón de cartas flotantes */}
        <div className="absolute inset-0 overflow-hidden opacity-[0.03]">
          <Spade className="absolute top-[10%] left-[15%] w-24 h-24 text-gold animate-[float_6s_ease-in-out_infinite]" />
          <Diamond className="absolute top-[20%] right-[20%] w-32 h-32 text-gold animate-[float_8s_ease-in-out_infinite_1s]" />
          <Club className="absolute bottom-[30%] left-[10%] w-28 h-28 text-gold animate-[float_7s_ease-in-out_infinite_0.5s]" />
          <Heart className="absolute bottom-[15%] right-[15%] w-20 h-20 text-gold animate-[float_5s_ease-in-out_infinite_1.5s]" />
          <Spade className="absolute top-[60%] left-[50%] w-16 h-16 text-gold animate-[float_9s_ease-in-out_infinite_2s]" />
        </div>
        
        {/* Líneas decorativas */}
        <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-gold/20 to-transparent" />
        <div className="absolute top-0 right-1/4 w-px h-full bg-gradient-to-b from-transparent via-gold/20 to-transparent" />
      </div>

      {/* Card de Login */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Glow effect detrás del card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-gold/20 via-gold/10 to-gold/20 rounded-2xl blur-xl opacity-50" />
        
        <div className="relative bg-charcoal/90 backdrop-blur-xl border border-gold/20 rounded-2xl p-8 shadow-2xl">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            {/* Icono decorativo */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 mb-4">
              <div className="flex items-center gap-0.5">
                <Spade className="w-5 h-5 text-gold" />
                <Diamond className="w-5 h-5 text-ruby" />
                <Club className="w-5 h-5 text-gold" />
                <Heart className="w-5 h-5 text-ruby" />
              </div>
            </div>
            
            <h1 className="text-3xl font-bold font-display">
              <span className="bg-gradient-to-r from-gold-light via-gold to-gold-dark bg-clip-text text-transparent">
                Poker Sala
              </span>
            </h1>
            <p className="text-silver mt-2">Sistema de Control y Operación</p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Error global */}
            {error && (
              <div className="p-4 rounded-lg bg-ruby/10 border border-ruby/30 text-ruby text-sm animate-[fadeIn_0.3s_ease-out]">
                {error}
              </div>
            )}

            {/* Email */}
            <Input
              label="Correo electrónico"
              type="email"
              placeholder="tu@email.com"
              leftIcon={<Mail className="w-5 h-5" />}
              error={errors.email?.message}
              {...register('email')}
            />

            {/* Password */}
            <div className="relative">
              <Input
                label="Contraseña"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                leftIcon={<Lock className="w-5 h-5" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-silver hover:text-gold transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5" />
                    ) : (
                      <Eye className="w-5 h-5" />
                    )}
                  </button>
                }
                error={errors.password?.message}
                {...register('password')}
              />
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-graphite bg-slate text-gold focus:ring-gold focus:ring-offset-0 cursor-pointer"
                />
                <span className="text-silver group-hover:text-pearl transition-colors">
                  Recordarme
                </span>
              </label>
              <a
                href="#"
                className="text-gold hover:text-gold-light transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Submit */}
            <Button
              type="submit"
              isLoading={isLoading}
              className="w-full"
              size="lg"
            >
              Iniciar Sesión
            </Button>
          </form>

          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-graphite">
            <p className="text-center text-silver text-sm">
              Sistema exclusivo para personal autorizado
            </p>
          </div>
        </div>

        {/* Decoración inferior */}
        <div className="flex justify-center gap-3 mt-6">
          <div className="w-2 h-2 rounded-full bg-gold/30" />
          <div className="w-2 h-2 rounded-full bg-gold/50" />
          <div className="w-2 h-2 rounded-full bg-gold/30" />
        </div>
      </div>
    </div>
  );
}
