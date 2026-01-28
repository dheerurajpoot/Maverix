"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Feed from "@/components/Feed";
import AnnouncementModal from "@/components/AnnouncementModal";

export default function EmployeeFeedPage() {
	const { data: session } = useSession();
	const [announcements, setAnnouncements] = useState<any[]>([]);
	const [currentAnnouncementIndex, setCurrentAnnouncementIndex] = useState(0);
	const [showAnnouncement, setShowAnnouncement] = useState(false);

	useEffect(() => {
		if (session) {
			fetchAnnouncements();
		}
	}, [session]);

	const fetchAnnouncements = async () => {
		try {
			const res = await fetch("/api/announcements");
			const data = await res.json();
			if (res.ok && data.announcements && data.announcements.length > 0) {
				setAnnouncements(data.announcements);
				setCurrentAnnouncementIndex(0);
				setShowAnnouncement(true);
			}
		} catch (err) {
			console.error("Error fetching announcements:", err);
		}
	};

	const handleAnnouncementClose = () => {
		if (currentAnnouncementIndex < announcements.length - 1) {
			// Show next announcement
			setCurrentAnnouncementIndex(currentAnnouncementIndex + 1);
		} else {
			// All announcements shown
			setShowAnnouncement(false);
			setAnnouncements([]);
		}
	};

	const handleAnnouncementViewTracked = () => {
		// Refresh announcements to get updated view counts
		fetchAnnouncements();
	};

	return (
		<DashboardLayout role='employee'>
			{/* Announcement Modal */}
			{showAnnouncement &&
				announcements.length > 0 &&
				announcements[currentAnnouncementIndex] && (
					<AnnouncementModal
						announcement={announcements[currentAnnouncementIndex]}
						onClose={handleAnnouncementClose}
						onViewTracked={handleAnnouncementViewTracked}
					/>
				)}

			<div className='min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'>
				<div className='space-y-6 p-4 md:p-6'>
					<Feed />
				</div>
			</div>
		</DashboardLayout>
	);
}
