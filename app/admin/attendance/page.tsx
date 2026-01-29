import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import dynamic from "next/dynamic";
import AttendanceManagement from "@/components/AttendanceManagement";
import LoadingDots from "@/components/LoadingDots";

const DashboardLayout = dynamic(
	() => import("@/components/DashboardLayout"),
	{ ssr: false },
);

export default async function AdminAttendancePage() {
	const session = await getServerSession(authOptions);

	if (!session || (session.user as any).role !== "admin") {
		redirect("/login");
	}

	return (
		<DashboardLayout role='admin'>
			<div className='space-y-4'>
				<div>
					<h1 className='text-2xl font-primary font-bold text-gray-800'>
						Attendance Management
					</h1>
					<p className='text-sm text-gray-600 mt-0.5 font-secondary'>
						View and manage employee attendance
					</p>
				</div>

				<Suspense
					fallback={
						<div className='flex flex-col items-center justify-center py-12 rounded-lg border border-gray-100 bg-white'>
							<LoadingDots size='lg' className='mb-3' />
							<p className='text-sm text-gray-500 font-secondary'>
								Loading attendance...
							</p>
						</div>
					}>
					<AttendanceManagement
						initialAttendance={[]}
						isAdminOrHR={true}
					/>
				</Suspense>
			</div>
		</DashboardLayout>
	);
}
