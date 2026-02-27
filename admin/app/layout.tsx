import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FlashRide Admin",
  description: "FlashRide administration panel",
};

const navItems = [
  { href: "/",        label: "Dashboard",  icon: "📊" },
  { href: "/users",   label: "Users",      icon: "👥" },
  { href: "/reports", label: "Reports",    icon: "🚨" },
  { href: "/rides",   label: "Rides",      icon: "🚗" },
  { href: "/audit",   label: "Audit Log",  icon: "📋" },
  { href: "/metrics", label: "Metrics",    icon: "📈" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geist.variable} font-sans antialiased bg-gray-50 min-h-screen`}>
        <div className="flex min-h-screen">
          {/* Sidebar */}
          <aside className="w-56 bg-gray-900 text-white flex flex-col shrink-0">
            <div className="px-5 py-6 border-b border-gray-700">
              <p className="text-lg font-bold tracking-tight">⚡ FlashRide</p>
              <p className="text-xs text-gray-400 mt-0.5">Admin Panel</p>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                >
                  <span>{item.icon}</span>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="px-5 py-4 border-t border-gray-700">
              <p className="text-xs text-gray-500">FlashRide © 2026</p>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
