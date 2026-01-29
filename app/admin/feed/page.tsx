"use client";
import DashboardLayout from "@/components/DashboardLayout";
import Feed from "@/components/Feed";

export default async function AdminFeedPage() {
	return (
		<DashboardLayout role='admin'>
			<div className='min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'>
				<div className='space-y-6 p-4 md:p-6'>
					<Feed />
				</div>
			</div>
		</DashboardLayout>
	);
}
