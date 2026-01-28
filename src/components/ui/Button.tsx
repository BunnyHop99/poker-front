import { ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const baseStyles = `
      inline-flex items-center justify-center gap-2
      font-semibold rounded-lg
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-gold/50 focus:ring-offset-2 focus:ring-offset-midnight
      disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
    `;

    const variants = {
      primary: `
        bg-gradient-to-r from-gold to-gold-dark
        text-midnight
        hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]
        hover:-translate-y-0.5
        active:translate-y-0
      `,
      secondary: `
        bg-transparent
        text-gold
        border border-gold
        hover:bg-gold/10
      `,
      ghost: `
        bg-transparent
        text-pearl
        hover:bg-white/5
      `,
      danger: `
        bg-gradient-to-r from-ruby to-red-700
        text-white
        hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]
        hover:-translate-y-0.5
      `,
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-base',
      lg: 'px-7 py-3.5 text-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            {leftIcon}
            {children}
            {rightIcon}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
