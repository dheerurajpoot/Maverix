import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import LandingPage from "@/components/LandingPage";

export default async function Home() {
	const session = await getServerSession(authOptions);

	// If user is logged in, redirect to their dashboard
	if (session) {
		const role = (session.user as any).role;
		const approved = (session.user as any).approved;

		if (role === "admin") {
			redirect("/admin");
		} else if (role === "hr") {
			redirect("/hr");
		} else if (role === "employee") {
			// Redirect to waiting page only if explicitly not approved (false)
			// If approved is undefined/null, treat as approved (for existing employees)
			if (approved === false) {
				redirect("/employee/waiting");
			} else {
				redirect("/employee");
			}
		}
	}

	return <LandingPage />;
}
