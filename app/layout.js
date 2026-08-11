import "./globals.css";

export const metadata = {
  title: "Frame",
  description: "A photo journal for people who still think in rolls of film.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
