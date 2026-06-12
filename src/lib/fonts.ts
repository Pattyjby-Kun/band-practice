import { Noto_Sans_Thai } from "next/font/google";

export const notoSansThai = Noto_Sans_Thai({
  variable: "--font-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const googleSansFlexFamily =
  '"Google Sans Flex", var(--font-thai), ui-sans-serif, system-ui, sans-serif';
