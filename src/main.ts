import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import './assets/main.scss'

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import vuetify from './plugins/vuetify'

const app = createApp(App)

app.config.errorHandler = (err, _instance, info) => {
  console.error('[global] Unhandled error:', err, info)
}

app.use(createPinia())
app.use(router)
app.use(vuetify)

app.mount('#app')
