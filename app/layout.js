import "./globals.css";

export const metadata = {
  title: "ผิวน้ำ — Water Interval",
  description: "A Japanese lakeside scene where daylight and seasons pass over still water.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
