"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { User, Mail, Phone, Briefcase, Calendar, Globe } from "lucide-react";
import { format } from "date-fns";
import LoadingDots from "./LoadingDots";

export default function EmployeeProfileCard() {
	const { data: session } = useSession();
	const [userProfile, setUserProfile] = useState<any>(null);
	const [loading, setLoading] = useState(true);

	useEffect(() => {
		if (session) {
			fetchUserProfile();
		}
	}, [session]);

	const fetchUserProfile = async () => {
		try {
			const res = await fetch("/api/profile");
			const data = await res.json();
			if (res.ok && data.user) {
				setUserProfile(data.user);
			}
		} catch (err) {
			console.error("Error fetching user profile:", err);
		} finally {
			setLoading(false);
		}
	};

	const formatDateOfBirth = (dateString?: string) => {
		if (!dateString) return "Not set";
		try {
			return format(new Date(dateString), "MMM dd, yyyy");
		} catch {
			return "Not set";
		}
	};

	return (
		<>
			{loading ? (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className='rounded-md overflow-hidden bg-white shadow-lg h-[400px] flex flex-col border border-gray-100'>
					<div className='p-6 flex items-center justify-center flex-1'>
						<LoadingDots size='md' />
					</div>
				</motion.div>
			) : (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className='profile-card-background rounded-md overflow-hidden bg-white shadow-lg hover:shadow-xl transition-all h-[400px] flex flex-col border border-gray-100'>
					{/* Top Section - Profile Picture and Name/ID */}
					<div className='p-4 border-b border-gray-100'>
						<div className='flex items-start gap-4'>
							{/* Profile Picture */}
							<div className='relative flex-shrink-0'>
								<div className='w-[50px] h-[50px] rounded-full overflow-hidden border-2 border-gray-200 shadow-md bg-white'>
									{userProfile?.profileImage ||
									(session?.user as any)?.profileImage ? (
										<img
											src={
												userProfile?.profileImage ||
												(session?.user as any)
													?.profileImage
											}
											alt={
												userProfile?.name ||
												session?.user?.name ||
												"User"
											}
											className='w-full h-full object-cover'
										/>
									) : (
										<div className='w-full h-full bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center'>
											<User className='w-10 h-10 text-white' />
										</div>
									)}
								</div>
							</div>

							{/* Name and Employee ID */}
							<div className='flex-1 min-w-0'>
								<h3 className='text-base font-bold text-gray-900 font-primary truncate'>
									{userProfile?.name ||
										session?.user?.name ||
										"Employee"}
								</h3>
								{userProfile?.empId && (
									<div className='inline-flex items-center'>
										<span className='text-xs font-bold text-primary'>
											ID: {userProfile.empId}
										</span>
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Information Rows */}
					<div className='flex-1 p-4 space-y-1'>
						{/* Email Row */}
						<div className='flex items-center gap-3 p-2.5'>
							<div className='w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm'>
								<Mail className='w-4 h-4 text-primary' />
							</div>
							<div className='flex-1 min-w-0'>
								<p className='text-[10px] text-gray-500 font-medium font-secondary uppercase'>
									Email
								</p>
								<p className='text-xs font-semibold text-gray-900 font-secondary truncate'>
									{userProfile?.email ||
										session?.user?.email ||
										"N/A"}
								</p>
							</div>
						</div>

						{/* Phone Row */}
						<div className='flex items-center gap-3 p-2.5'>
							<div className='w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm'>
								<Phone className='w-4 h-4 text-primary' />
							</div>
							<div className='flex-1 min-w-0'>
								<p className='text-[10px] text-gray-500 font-medium font-secondary uppercase'>
									Mobile
								</p>
								<p className='text-xs font-semibold text-gray-900 font-secondary'>
									{userProfile?.mobileNumber || "Not set"}
								</p>
							</div>
						</div>

						{/* Designation Row */}
						<div className='flex items-center gap-3 p-2.5'>
							<div className='w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm'>
								<Briefcase className='w-4 h-4 text-primary' />
							</div>
							<div className='flex-1 min-w-0'>
								<p className='text-[10px] text-gray-500 font-medium font-secondary uppercase'>
									Designation
								</p>
								<p className='text-xs font-semibold text-gray-900 font-secondary truncate'>
									{userProfile?.designation || "Not set"}
								</p>
							</div>
						</div>

						{/* Date of Birth Row */}
						{userProfile?.dateOfBirth && (
							<div className='flex items-center gap-3 p-2.5'>
								<div className='w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm'>
									<Calendar className='w-4 h-4 text-primary' />
								</div>
								<div className='flex-1 min-w-0'>
									<p className='text-[10px] text-gray-500 font-medium font-secondary uppercase'>
										Date of Birth
									</p>
									<p className='text-xs font-semibold text-gray-900 font-secondary'>
										{formatDateOfBirth(
											userProfile.dateOfBirth,
										)}
									</p>
								</div>
							</div>
						)}

						{/* Website Row */}
						<a
							href='http://mavericksmedia.org/'
							target='_blank'
							rel='noopener noreferrer'
							className='flex items-center gap-3 p-2.5 group'>
							<div className='w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm group-hover:scale-105 transition-transform'>
								<Globe className='w-4 h-4 text-primary' />
							</div>
							<div className='flex-1 min-w-0'>
								<p className='text-[10px] text-gray-500 font-medium font-secondary uppercase'>
									Website
								</p>
								<p className='text-xs font-semibold text-primary font-secondary truncate group-hover:text-primary-dark'>
									mavericksmedia.org
								</p>
							</div>
						</a>
					</div>
				</motion.div>
			)}
		</>
	);
}
