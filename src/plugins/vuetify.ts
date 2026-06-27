import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

// Theme built from the author's hand-drawn LinkedIn banner: a white canvas, a
// lime marker accent, near-black ink, and a hand-drawn red. Lime is the *brand*
// colour (buttons, highlights); the health verdicts keep their own semantic
// green / amber / red so status stays readable.
export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: { mdi },
  },
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          background: '#ffffff',
          surface: '#ffffff',
          primary: '#c8f03c', // lime marker
          'on-primary': '#111111', // black text on lime
          ink: '#111111',
          success: '#2fa84f', // healthy (variant A: distinct from lime)
          warning: '#e8a317', // caution
          error: '#ff2d2d', // risky — the banner's red
        },
      },
    },
  },
  defaults: {
    VCard: { rounded: 'lg', flat: true, border: true },
    VBtn: { rounded: 'md', flat: true },
    VAppBar: { flat: true },
  },
})
