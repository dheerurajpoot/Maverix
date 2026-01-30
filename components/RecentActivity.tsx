"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import { Calendar, LogIn, LogOut, Activity } from "lucide-react";
import { format } from "date-fns";
import UserAvatar from "./UserAvatar";
import LoadingDots from "./LoadingDots";

const PAGE_SIZE = 8;

interface ActivityItem {
	type: "clockIn" | "clockOut" | "leaveRequest";
	id: string;
	userId: {
		_id: string;
		name: string;
		email: string;
		profileImage?: string;
	};
	timestamp: string;
	details: { date?: string; leaveType?: string; status?: string };
}

function getActivityText(activity: ActivityItem): string {
	switch (activity.type) {
		case "clockIn":
			return "clocked in";
		case "clockOut":
			return "clocked out";
		case "leaveRequest":
			return `requested ${activity.details.leaveType ?? "leave"}`;
		default:
			return "performed an action";
	}
}

export default function RecentActivity() {
	const [activities, setActivities] = useState<ActivityItem[]>([]);
	const [total, setTotal] = useState(0);
	const [hasMore, setHasMore] = useState(false);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);

	const fetchActivities = useCallback(async (skip: number) => {
		const append = skip > 0;
		if (append) setLoadingMore(true);
		else setLoading(true);
		try {
			const res = await fetch(
				`/api/admin/recent-activities?limit=${PAGE_SIZE}&skip=${skip}`,
			);
			const data = await res.json();
			if (!res.ok) return;
			const list = data.activities ?? [];
			const newTotal = data.total ?? 0;
			const newHasMore = data.hasMore ?? false;
			setTotal(newTotal);
			setHasMore(newHasMore);
			setActivities((prev) => (append ? [...prev, ...list] : list));
		} catch (err) {
			console.error("Error fetching recent activities:", err);
		} finally {
			setLoading(false);
			setLoadingMore(false);
		}
	}, []);

	useEffect(() => {
		fetchActivities(0);
	}, [fetchActivities]);

	const handleLoadMore = () => {
		if (!loadingMore && hasMore) fetchActivities(activities.length);
	};

	const displayCount = activities.length;

	return (
		<div className='bg-white rounded-md border border-gray-100 shadow-lg w-full h-[400px] flex flex-col overflow-hidden'>
			<div className='flex items-center justify-between flex-shrink-0 p-3 border-b border-gray-200 bg-white'>
				<div className='flex items-center gap-2'>
					<div className='p-1.5 bg-blue-100 rounded-md'>
						<Activity className='w-3.5 h-3.5 text-blue-600' />
					</div>
					<div>
						<h2 className='text-sm font-primary font-bold text-gray-900'>
							Recent Activity
						</h2>
						<p className='text-[9px] text-gray-500 font-secondary mt-0.5'>
							{format(new Date(), "MMMM d, yyyy")} •{" "}
							{displayCount === total
								? `${total} ${total === 1 ? "activity" : "activities"}`
								: `${displayCount} of ${total} shown`}
						</p>
					</div>
				</div>
				<div className='px-2.5 py-1 bg-blue-100 rounded-full flex items-center gap-1 flex-shrink-0'>
					<span className='text-xs font-bold text-blue-700 font-primary'>
						{displayCount}
					</span>
				</div>
			</div>

			<div className='flex-1 overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'>
				{loading && displayCount === 0 ? (
					<div className='flex flex-col items-center justify-center py-12'>
						<LoadingDots size='lg' className='mb-2' />
						<p className='text-sm text-gray-500 font-secondary mt-2'>
							Loading activities...
						</p>
					</div>
				) : displayCount === 0 ? (
					<div className='flex flex-col items-center justify-center py-12'>
						<div className='p-4 bg-gray-100 rounded-full mb-4'>
							<Activity className='w-8 h-8 text-gray-400' />
						</div>
						<p className='text-base font-primary font-semibold text-gray-600 mb-1'>
							No activities today
						</p>
						<p className='text-sm text-gray-500 font-secondary'>
							Today&apos;s activities will appear here
						</p>
					</div>
				) : (
					<div className='space-y-1.5'>
						{activities.map((activity, index) => {
							if (!activity.userId) return null;
							const isClockIn = activity.type === "clockIn";
							const isClockOut = activity.type === "clockOut";
							return (
								<motion.div
									key={activity.id}
									initial={{ opacity: 0, x: -10 }}
									animate={{ opacity: 1, x: 0 }}
									transition={{ delay: index * 0.03 }}
									className='group rounded-md transition-all duration-200 p-4 relative bg-gray-50 hover:bg-gray-100'>
									<div className='flex items-center gap-3'>
										<div
											className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${
												isClockIn
													? "bg-green-100"
													: isClockOut
														? "bg-red-100"
														: "bg-blue-100"
											}`}>
											{isClockIn ? (
												<LogIn className='w-3.5 h-3.5 text-green-600' />
											) : isClockOut ? (
												<LogOut className='w-3.5 h-3.5 text-red-600' />
											) : (
												<Calendar className='w-3.5 h-3.5 text-blue-600' />
											)}
										</div>
										<UserAvatar
											name={activity.userId.name ?? "Unknown"}
											image={activity.userId.profileImage}
											size='sm'
											className='flex-shrink-0'
										/>
										<div className='flex-1 min-w-0'>
											<div className='flex flex-col'>
												<span className='text-xs font-semibold text-gray-900 font-primary leading-tight'>
													{activity.userId.name ?? "Unknown"}
												</span>
												<span className='text-[10px] text-gray-500 font-secondary leading-tight'>
													{getActivityText(activity)}
												</span>
											</div>
										</div>
										<div className='flex-shrink-0'>
											<span className='text-[10px] text-gray-500 font-secondary whitespace-nowrap'>
												{format(new Date(activity.timestamp), "HH:mm")}
											</span>
										</div>
									</div>
								</motion.div>
							);
						})}
						{hasMore && (
							<div className='pt-2 pb-1 flex justify-center'>
								<button
									type='button'
									onClick={handleLoadMore}
									disabled={loadingMore}
									className='px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none'>
									{loadingMore ? (
										<span className='flex items-center gap-2'>
											<LoadingDots size='sm' /> Loading...
										</span>
									) : (
										"Load more"
									)}
								</button>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
