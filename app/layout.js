import "./globals.css";

export const metadata = {
  title: "Frame",
  description: "A photo journal for people who still think in rolls of film.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="font-sans">{children}</body>
    </html>
  );
}
