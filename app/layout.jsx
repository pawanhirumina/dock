import "./globals.css";

export const metadata = {
  title: "Dev Board",
  description: "Personal Dev Board",
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
