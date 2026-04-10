// manifest.js
export const pwaManifest = {
  name: 'SmartPet Warden',
  short_name: 'PetWarden',
  description: 'Smart Park Management System',
  theme_color: '#2e7d32',
  background_color: '#f0f2f5',
  display: 'standalone',
  icons: [
    {
      src: '/pwa-192x192.png',
      sizes: '192x192',
      type: 'image/png'
    },
    {
      src: '/pwa-512x512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'any maskable'
    }
  ]
}