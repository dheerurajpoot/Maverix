"use client";
import Profile from "@/components/Profile";
import DashboardLayout from "@/components/DashboardLayout";

export default function HRProfilePage() {
	return (
		<DashboardLayout role='hr'>
			<div className='p-4 md:p-6'>
				<Profile />
			</div>
		</DashboardLayout>
	);
}
