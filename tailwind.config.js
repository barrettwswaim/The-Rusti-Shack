/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        ocean: {
          DEFAULT: '#1C7A8C',
          dark: '#12525F',
          light: '#5FA8B8',
        },
        lagoon: '#E7F3F1',
        sand: {
          DEFAULT: '#FBF3E6',
          deep: '#F1E2C9',
        },
        coral: {
          DEFAULT: '#F2734A',
          dark: '#D95C36',
        },
        ink: '#22333B',
      },
      fontFamily: {
        heading: [
          '-apple-system', 'ui-rounded', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
        body: [
          '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif',
        ],
      },
      maxWidth: {
        content: '1180px',
      },
    },
  },
  plugins: [],
};
