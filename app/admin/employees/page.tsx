import dynamic from "next/dynamic";

const DashboardLayout = dynamic(() => import("@/components/DashboardLayout"), {
	ssr: false,
});
import EmployeeManagement from "@/components/EmployeeManagement";

export default function EmployeesPage() {
	return (
		<DashboardLayout role='admin'>
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

				<EmployeeManagement />
			</div>
		</DashboardLayout>
	);
}
