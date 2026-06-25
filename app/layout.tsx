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
        {/* Varioqub anti-flicker */}
        <style>{`.varioqub-antiflicker{opacity:0!important}`}</style>
        <Script id="varioqub-antiflicker" strategy="beforeInteractive">{`
(function(a,n,t,i,f,li,c,k,e,r){
  a[t]=a[t]||function(){(a[t].a=a[t].a||[]).push(arguments)};
  n.classList.add(i);c=function(){n.classList.remove(i)};
  li.callback=c;a[t].antiFlicker=li;setTimeout(c,f);
})(window,document.documentElement,'ymab','varioqub-antiflicker',4000,{'metrika.107703259':true});
        `}</Script>
        {/* Varioqub experiments */}
        <Script id="varioqub-init" strategy="beforeInteractive">{`
(function(e,x,pe,r,i,me,nt){
  e[i]=e[i]||function(){(e[i].a=e[i].a||[]).push(arguments)},
  me=x.createElement(pe),me.async=1,me.src=r,nt=x.getElementsByTagName(pe)[0],
  me.addEventListener('error',function(){function cb(t){t=t[t.length-1],'function'==typeof t&&t({flags:{}})};Array.isArray(e[i].a)&&e[i].a.forEach(cb);e[i]=function(){cb(arguments)}}),
  nt.parentNode.insertBefore(me,nt)
})(window,document,'script','https://abt.s3.yandex.net/expjs/latest/exp.js','ymab');
ymab('metrika.107703259','init');
        `}</Script>
        {/* Yandex.Metrika counter */}
        <Script id="yandex-metrika" strategy="afterInteractive">
          {`
    (function(m,e,t,r,i,k,a){
      m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
      m[i].l=1*new Date();
      for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
      k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)
    })(window, document,'script','https://mc.yandex.ru/metrika/tag.js?id=107703259', 'ym');
    ym(107703259, 'init', {ssr:true, webvisor:true, clickmap:true, ecommerce:"dataLayer", referrer: document.referrer, url: location.href, accurateTrackBounce:true, trackLinks:true});
          `}
        </Script>
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
      </head>
      <body className={`${wixFont.className} ${wixFont.variable} bg-black text-white min-h-screen`}>
        <noscript><div><img src="https://mc.yandex.ru/watch/107703259" style={{position:'absolute', left:'-9999px'}} alt="" /></div></noscript>
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
