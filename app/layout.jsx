import "./globals.css";

export const metadata = {
  title: "Dock",
  description: "Personal Dock",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
      </body>
    </html>
  );
}
