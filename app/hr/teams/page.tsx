"use client";
import DashboardLayout from "@/components/DashboardLayout";
import TeamManagement from "@/components/TeamManagement";

export default function HRTeamsPage() {
	return (
		<DashboardLayout role='hr'>
			<div className='p-4 md:p-6'>
				<TeamManagement />
			</div>
		</DashboardLayout>
	);
}
