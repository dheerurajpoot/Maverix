import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";
import Attendance from "@/models/Attendance";
import Leave from "@/models/Leave";
import Penalty from "@/models/Penalty";
import Settings from "@/models/Settings";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 60;

export async function GET(request: NextRequest) {
	try {
		const session = await getServerSession(authOptions);
		if (!session) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 },
			);
		}
		const role = (session.user as { role?: string }).role;
		if (role !== "admin" && role !== "hr") {
			return NextResponse.json({ error: "Forbidden" }, { status: 403 });
		}

		await connectDB();

		const dateParam = request.nextUrl.searchParams.get("date");
		if (!dateParam) {
			return NextResponse.json(
				{ error: "Date is required" },
				{ status: 400 },
			);
		}

		const limit = Math.min(
			Math.max(
				1,
				Number(request.nextUrl.searchParams.get("limit")) ||
					DEFAULT_LIMIT,
			),
			MAX_LIMIT,
		);
		const skip = Math.max(
			0,
			Number(request.nextUrl.searchParams.get("skip")) || 0,
		);
		const search = (
			request.nextUrl.searchParams.get("search") || ""
		).trim();

		const selectedDate = new Date(dateParam);
		selectedDate.setHours(0, 0, 0, 0);
		const nextDay = new Date(selectedDate);
		nextDay.setDate(nextDay.getDate() + 1);
		const endOfDate = new Date(selectedDate);
		endOfDate.setHours(23, 59, 59, 999);

		const baseQuery: Record<string, unknown> = { role: { $ne: "admin" } };
		if (search) {
			const searchRegex = {
				$regex: search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
				$options: "i",
			};
			baseQuery.$or = [
				{ name: searchRegex },
				{ email: searchRegex },
				{ designation: searchRegex },
			];
		}

		const [total, users] = await Promise.all([
			User.countDocuments(baseQuery),
			User.find(baseQuery)
				.select(
					"_id name email profileImage designation weeklyOff clockInTime",
				)
				.sort({ name: 1 })
				.skip(skip)
				.limit(limit)
				.lean(),
		]);

		const userIds = (users as { _id: unknown }[]).map((u) => u._id);

		const [attendance, leavesOnDate, defaultSetting, penalties] =
			await Promise.all([
				userIds.length > 0
					? Attendance.find({
							date: { $gte: selectedDate, $lt: nextDay },
							userId: { $in: userIds },
						})
							.populate(
								"userId",
								"name email profileImage designation weeklyOff",
							)
							.sort({ clockIn: -1 })
							.lean()
					: [],
				Leave.find({
					status: "approved",
					allottedBy: { $exists: false },
					startDate: { $lte: endOfDate },
					endDate: { $gte: selectedDate },
					reason: {
						$not: {
							$regex: /penalty|clock.*in.*late|exceeded.*max.*late|auto.*deduct|leave.*deduction/i,
						},
					},
				})
					.select("userId")
					.lean(),
				Settings.findOne({ key: "defaultClockInTimeLimit" })
					.select("value")
					.lean(),
				userIds.length > 0
					? (async () => {
							const penaltyList = await Penalty.find({
								userId: { $in: userIds },
								date: { $gte: selectedDate, $lte: endOfDate },
							})
								.select("userId")
								.lean();
							const map: Record<string, { hasPenalty: boolean }> =
								{};
							for (const p of penaltyList as {
								userId: unknown;
							}[]) {
								const uid =
									p.userId &&
									typeof p.userId === "object" &&
									(p.userId as { _id?: unknown })._id != null
										? String(
												(p.userId as { _id: unknown })
													._id,
											)
										: String(p.userId);
								map[uid] = { hasPenalty: true };
							}
							return map;
						})()
					: {},
			]);

		const userIdsOnLeave = Array.from(
			new Set(
				(leavesOnDate as { userId?: unknown }[])
					.map((l) =>
						l.userId &&
						typeof l.userId === "object" &&
						(l.userId as { _id?: unknown })._id != null
							? String((l.userId as { _id: unknown })._id)
							: String(l.userId),
					)
					.filter(Boolean),
			),
		);

		const hasMore = skip + (users as unknown[]).length < total;

		const res = NextResponse.json({
			employees: users,
			attendance: attendance || [],
			userIdsOnLeave,
			defaultClockInTimeLimit:
				(defaultSetting as { value?: string } | null)?.value ?? "",
			penalties,
			total,
			hasMore,
		});
		res.headers.set(
			"Cache-Control",
			"private, s-maxage=30, stale-while-revalidate=60",
		);
		return res;
	} catch (error) {
		console.error("Attendance page error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}
