import type { Metadata, Viewport } from "next";
import { Open_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const openSans = Open_Sans({
	subsets: ["latin"],
	variable: "--font-open-sans",
	weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
	title: "MaveriX – Smart HRM Software for Modern Businesses",
	description:
		"MaveriX is an all-in-one HRM software for employee management, payroll, attendance, and performance tracking. Made with ❤️ by Iconic Chandu",

	keywords: [
		"HRM Software",
		"HR Management System",
		"Human Resource Software",
		"Payroll Management",
		"Employee Management System",
		"HRMS Software",
		"HRMS System",
		"HRMS Software for Small Businesses",
		"HRMS Software for Large Businesses",
		"HRMS Software for Medium Businesses",
		"HRMS Software for Startups",
		"HRMS Software for Enterprises",
	],
	authors: [{ name: "Iconic Chandu", url: "https://iconicchandu.online/" }],
	creator: "Iconic Chandu",
	publisher: "Iconic Chandu",
	openGraph: {
		title: "MaveriX – Smart HRM Software for Modern Businesses",
		description:
			"MaveriX is an all-in-one HRM software for employee management, payroll, attendance, and performance tracking. Made with ❤️ by Iconic Chandu",
		url: "https://www.maverix.online",
		siteName: "MaveriX",
		images: [
			{
				url: "/assets/maverixicon.png",
				width: 1200,
				height: 630,
				alt: "MaveriX",
			},
		],
		locale: "en_US",
		type: "website",
	},
	icons: {
		icon: [{ url: "/assets/maverixicon.png", sizes: "any" }],
		apple: [
			{
				url: "/assets/maverixicon.png",
				sizes: "180x180",
				type: "image/png",
			},
		],
	},
	appleWebApp: {
		capable: true,
		statusBarStyle: "black-translucent",
		title: "MaveriX",
	},
	other: {
		"apple-mobile-web-app-capable": "yes",
		"apple-mobile-web-app-status-bar-style": "black-translucent",
		"apple-mobile-web-app-title": "MaveriX",
	},
};

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	maximumScale: 1,
	userScalable: false,
	themeColor: "#6366f1",
	viewportFit: "cover",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang='en' className={openSans.variable} suppressHydrationWarning>
			<body suppressHydrationWarning>
				<Providers>{children}</Providers>
			</body>
		</html>
	);
}
