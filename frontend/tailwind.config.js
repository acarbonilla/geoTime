/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-in': 'bounceIn 0.6s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'float': 'float 3s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.3)' },
          '50%': { opacity: '1', transform: 'scale(1.05)' },
          '70%': { transform: 'scale(0.9)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        glow: {
          '0%': { boxShadow: '0 0 5px #3B82F6, 0 0 10px #3B82F6, 0 0 15px #3B82F6' },
          '100%': { boxShadow: '0 0 10px #3B82F6, 0 0 20px #3B82F6, 0 0 30px #3B82F6' }
        }
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 20px rgba(59, 130, 246, 0.3)',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      }
    },
  },
  plugins: [],
  safelist: [
    // Status pill colors - prevent purging of dynamic classes
    'text-green-700', 'bg-green-100', 'border-green-200',
    'text-orange-700', 'bg-orange-100', 'border-orange-200',
    'text-red-700', 'bg-red-100', 'border-red-200',
    'text-gray-700', 'bg-gray-100', 'border-gray-200',
    'text-yellow-700', 'bg-yellow-100', 'border-yellow-200',
    'text-blue-700', 'bg-blue-100', 'border-blue-200',
    // Common utility classes that might be purged
    'inline-flex', 'items-center', 'space-x-2', 'px-3', 'py-1', 'text-xs', 'font-medium', 'rounded-full', 'border'
  ]
} 