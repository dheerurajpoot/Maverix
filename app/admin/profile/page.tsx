"use client";
import DashboardLayout from "@/components/DashboardLayout";
import Profile from "@/components/Profile";

export default function AdminProfilePage() {
	return (
		<DashboardLayout role='admin'>
			<div className='p-4 md:p-6'>
				<Profile />
			</div>
		</DashboardLayout>
	);
}
