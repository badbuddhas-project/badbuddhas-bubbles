import type { Metadata, Viewport } from 'next'
import { Wix_Madefor_Display } from 'next/font/google'
import Script from 'next/script'
import './globals.css'
import { TelegramProvider } from '@/components/TelegramProvider'
import { AuthProvider } from '@/components/AuthProvider'
import { LanguageProvider } from '@/lib/i18n'

const wixFont = Wix_Madefor_Display({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-wix',
})

export const metadata: Metadata = {
  title: 'Breathwork with BadBuddhas',
  description: 'Telegram Mini App for breathwork practice',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <head>
        {/*
          Telegram Web App SDK — must load BEFORE React hydration so that
          window.Telegram.WebApp is available when client components first run.
          strategy="beforeInteractive" guarantees this.
          https://core.telegram.org/bots/webapps#initializing-mini-apps
        */}
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
        {/* Yandex.Metrika counter */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(m,e,t,r,i,k,a){
  m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
  m[i].l=1*new Date();
  for (var j = 0; j < document.scripts.length; j++) {
    if (document.scripts[j].src === r) { return; }
  }
  k=e.createElement(t),a=e.getElementsByTagName(t)[0];
  k.async=1;k.src=r;a.parentNode.insertBefore(k,a);
})(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
ym(107145193, 'init', {
  ssr: true,
  webvisor: true,
  clickmap: true,
  trackLinks: true,
  accurateTrackBounce: true,
  ecommerce: 'dataLayer'
});
            `
          }}
        />
        <noscript>
          <div>
            <img
              src="https://mc.yandex.ru/watch/107145193"
              style={{ position: 'absolute', left: '-9999px' }}
              alt=""
            />
          </div>
        </noscript>
      </head>
      <body className={`${wixFont.className} ${wixFont.variable} bg-black text-white min-h-screen`}>
        <TelegramProvider>
          <AuthProvider>
            <LanguageProvider>
              {children}
            </LanguageProvider>
          </AuthProvider>
        </TelegramProvider>
      </body>
    </html>
  )
}
