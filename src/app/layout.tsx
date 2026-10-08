import type { Metadata, Viewport } from "next";
import { Fraunces, Hind_Siliguri, Plus_Jakarta_Sans } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { RegisterSW } from "@/components/RegisterSW";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"] });
const bengali = Hind_Siliguri({
  variable: "--font-bengali",
  subsets: ["bengali"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "PujoGuide: Kolkata Durga Puja map & route planner",
  description:
    "Every Bonedi Bari and pandal in Kolkata on one map. Filter by area, find great food nearby, and plan your pandal-hopping route.",
  openGraph: {
    type: "website",
    siteName: "PujoGuide",
    title: "PujoGuide: Kolkata Durga Puja map & route planner",
    description:
      "Every Bonedi Bari and pandal in Kolkata on one map. Filter by area, find great food nearby, and plan your pandal-hopping route.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fff8f0" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0a14" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${jakarta.variable} ${fraunces.variable} ${bengali.variable} h-full`}
    >
      <body className="h-full overflow-hidden">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
          <RegisterSW />
        </ThemeProvider>
      </body>
    </html>
  );
}
