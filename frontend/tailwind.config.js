/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {},
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