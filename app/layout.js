import "./globals.css";

export const metadata = {
  metadataBase: new URL("https://getframeapp.vercel.app"),
  title: "Frame",
  description: "A photo journal for people who still think in rolls of film.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  openGraph: {
    title: "Frame",
    description: "A photo journal for people who still think in rolls of film.",
    url: "https://getframeapp.vercel.app",
    siteName: "Frame",
    images: [
      {
        url: "/og-image-v2.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Frame",
    description: "A photo journal for people who still think in rolls of film.",
    images: ["/og-image-v2.png"],
  },
};
const themeScript = `
(function() {
  try {
    var saved = localStorage.getItem('frame-theme');
    var theme = saved === 'light' || saved === 'dark'
      ? saved
      : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);

    var accent = localStorage.getItem('frame-accent');
    if (accent) {
      document.documentElement.setAttribute('data-accent', accent);
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
