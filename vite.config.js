import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // server:{
  //   proxy:{
  //     "/api":{
  //       target:"https://api2.passportindia.gov.in/v1/online/trackStatusForFileNo",
  //       changeOrigin:true,
  //       rewrite:(path)=>path.replace(/^\/api/, '')

  //     }
  //   }
  // }
  plugins: [react()],
  base:"/passport-status-tracker/"
})
