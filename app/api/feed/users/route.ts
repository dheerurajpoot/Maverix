import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 15;
const MAX_LIMIT = 30;

export async function GET(request: NextRequest) {
	try {
		const session = await getServerSession(authOptions);

		if (!session) {
			return NextResponse.json(
				{ error: "Unauthorized" },
				{ status: 401 },
			);
		}

		await connectDB();

		const q = (request.nextUrl.searchParams.get("q") || "").trim();
		const limit = Math.min(
			Math.max(
				1,
				Number(request.nextUrl.searchParams.get("limit")) ||
					DEFAULT_LIMIT,
			),
			MAX_LIMIT,
		);

		const filter: Record<string, unknown> = {};
		if (q) {
			const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
			const regex = { $regex: escaped, $options: "i" };
			filter.$or = [{ name: regex }, { email: regex }];
		}

		const users = await User.find(filter)
			.select("_id name email profileImage mobileNumber role designation")
			.sort({ name: 1 })
			.limit(limit)
			.lean();

		const response = NextResponse.json({ users });
		response.headers.set(
			"Cache-Control",
			"private, s-maxage=60, stale-while-revalidate=120",
		);
		return response;
	} catch (error: unknown) {
		console.error("Get users for mentions error:", error);
		return NextResponse.json(
			{ error: error instanceof Error ? error.message : "Server error" },
			{ status: 500 },
		);
	}
}
