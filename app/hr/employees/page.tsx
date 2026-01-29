import DashboardLayout from "@/components/DashboardLayout";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import EmployeeManagement from "@/components/EmployeeManagement";

export default async function HREmployeesPage() {
	await connectDB();
	const employees = await User.find({ role: { $ne: "admin" } })
		.select("-password")
		.select(
			"_id name email role designation profileImage emailVerified approved weeklyOff clockInTime createdAt",
		)
		.lean();

	return (
		<DashboardLayout role='hr'>
			<div className='space-y-4'>
				<div className='flex items-center justify-between'>
					<div>
						<h1 className='text-2xl font-primary font-bold text-gray-800'>
							Employee Management
						</h1>
						<p className='text-sm text-gray-600 mt-0.5 font-secondary'>
							Manage all employees in the system
						</p>
					</div>
				</div>

				<EmployeeManagement
					initialEmployees={JSON.parse(JSON.stringify(employees))}
					canChangeRole={false}
				/>
			</div>
		</DashboardLayout>
	);
}
