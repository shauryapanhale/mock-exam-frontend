import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MockPrep — AI-Powered Exam Platform',
  description: 'Generate, schedule, and attempt AI-crafted mock exams with live proctoring.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700&f[]=cabinet-grotesk@500,700,800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {/* Prevent theme flash on load */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var t = sessionStorage.getItem('theme') ||
                  (window.matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
                document.documentElement.setAttribute('data-theme', t);
              } catch(e) {}
            `,
          }}
        />
        {children}
      </body>
    </html>
  )
}