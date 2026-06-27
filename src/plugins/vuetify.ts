import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/iconsets/mdi'

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
          success: '#22c55e', // healthy
          warning: '#e8a317', // caution
          error: '#ef4444', // risky
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
