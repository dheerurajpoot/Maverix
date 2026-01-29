"use client";

import { useEffect, useState, Suspense } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import AttendanceManagement from "@/components/AttendanceManagement";
import LoadingDots from "@/components/LoadingDots";

export default function EmployeeAttendancePage() {
	const [attendance, setAttendance] = useState<any[]>([]);

	useEffect(() => {
		fetchAttendance();
	}, []);

	const fetchAttendance = async () => {
		try {
			const res = await fetch("/api/attendance");
			const data = await res.json();
			setAttendance(data.attendance || []);
		} catch (err) {
			console.error("Error fetching attendance:", err);
		}
	};

	return (
		<DashboardLayout role='employee'>
			<div className='space-y-4'>
				<div>
					<h1 className='text-2xl font-primary font-bold text-gray-800'>
						My Attendance
					</h1>
					<p className='text-sm text-gray-600 mt-0.5 font-secondary'>
						View your attendance history
					</p>
				</div>
				<Suspense
					fallback={
						<div className='flex flex-col items-center justify-center py-12'>
							<LoadingDots size='lg' className='mb-3' />
							<p className='text-sm text-gray-500 font-secondary'>
								Loading attendance...
							</p>
						</div>
					}>
					<AttendanceManagement initialAttendance={attendance} />
				</Suspense>
			</div>
		</DashboardLayout>
	);
}
