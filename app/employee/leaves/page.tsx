"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import EmployeeLeaveView from "@/components/EmployeeLeaveView";

export default function EmployeeLeavesPage() {
	const [leaves, setLeaves] = useState<any[]>([]);

	useEffect(() => {
		fetchLeaves();
	}, []);

	const fetchLeaves = async () => {
		try {
			const res = await fetch('/api/leave');
			const data = await res.json();
			setLeaves(data.leaves || []);
		} catch (err) {
			console.error("Error fetching leaves:", err);
		}
	};

	return (
		<DashboardLayout role='employee'>
			<div className='space-y-4'>
				<EmployeeLeaveView
					initialLeaves={leaves}
					onLeavesUpdated={fetchLeaves}
				/>
			</div>
		</DashboardLayout>
	);
}
