import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import dynamic from "next/dynamic";
import Profile from "@/components/Profile";
import DashboardLayout from "@/components/DashboardLayout";

export default async function EmployeeProfilePage() {
	const session = await getServerSession(authOptions);

	if (!session || (session.user as any).role !== "employee") {
		redirect("/login");
	}

	return (
		<DashboardLayout role='employee'>
			<div className='p-2 md:p-6'>
				<Profile />
			</div>
		</DashboardLayout>
	);
}
