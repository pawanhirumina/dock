import "./globals.css";
import { Toaster } from "@/components/ui/toast";

export const metadata = {
  title: "Dock",
  description: "Personal Dock",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
