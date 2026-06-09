import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Satoshi', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Cabinet Grotesk', 'Satoshi', 'system-ui', 'sans-serif'],
      },
      colors: {
        bg:                  'var(--color-bg)',
        surface:             'var(--color-surface)',
        'surface-2':         'var(--color-surface-2)',
        'surface-offset':    'var(--color-surface-offset)',
        'surface-dynamic':   'var(--color-surface-dynamic)',
        divider:             'var(--color-divider)',
        border:              'var(--color-border)',
        text:                'var(--color-text)',
        'text-muted':        'var(--color-text-muted)',
        'text-faint':        'var(--color-text-faint)',
        'text-inverse':      'var(--color-text-inverse)',
        primary:             'var(--color-primary)',
        'primary-hover':     'var(--color-primary-hover)',
        'primary-highlight': 'var(--color-primary-highlight)',
        success:             'var(--color-success)',
        'success-highlight': 'var(--color-success-highlight)',
        warning:             'var(--color-warning)',
        'warning-highlight': 'var(--color-warning-highlight)',
        error:               'var(--color-error)',
        'error-highlight':   'var(--color-error-highlight)',
      },
      borderRadius: {
        sm:   'var(--radius-sm)',
        md:   'var(--radius-md)',
        lg:   'var(--radius-lg)',
        xl:   'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
      keyframes: {
        shimmer: {
          '0%':   { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        shimmer:  'shimmer 1.5s ease-in-out infinite',
        'fade-in':'fadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
}

export default config