"use client";

import { useEffect, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import LoadingDots from "@/components/LoadingDots";
import { motion, AnimatePresence } from "framer-motion";
import {
	DollarSign,
	Calendar,
	Wallet,
	FileText,
	CreditCard,
	Building2,
	Save,
	X,
	Eye,
	EyeOff,
	Lock,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/contexts/ToastContext";

interface Finance {
	_id: string;
	month: number;
	year: number;
	baseSalary: number;
	totalSalary: number;
	createdAt: string;
}

interface User {
	bankName?: string;
	accountNumber?: string;
	ifscCode?: string;
}

export default function HRSalaryPage() {
	const [finances, setFinances] = useState<Finance[]>([]);
	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState<User | null>(null);
	const [showBankForm, setShowBankForm] = useState(false);
	const [bankLoading, setBankLoading] = useState(false);
	const [bankFormData, setBankFormData] = useState({
		bankName: "",
		accountNumber: "",
		ifscCode: "",
	});
	const [showSalary, setShowSalary] = useState(false);
	const [showPasswordModal, setShowPasswordModal] = useState(false);
	const [password, setPassword] = useState("");
	const [passwordError, setPasswordError] = useState("");
	const [verifyingPassword, setVerifyingPassword] = useState(false);
	const toast = useToast();

	useEffect(() => {
		fetchFinances();
		fetchUserProfile();
	}, []);

	const fetchUserProfile = async () => {
		try {
			const res = await fetch("/api/profile");
			const data = await res.json();
			if (res.ok && data.user) {
				setUser(data.user);
				setBankFormData({
					bankName: data.user.bankName || "",
					accountNumber: data.user.accountNumber || "",
					ifscCode: data.user.ifscCode || "",
				});
			}
		} catch (err) {
			console.error("Error fetching user profile:", err);
		}
	};

	const fetchFinances = async () => {
		try {
			const res = await fetch("/api/finance");
			const data = await res.json();
			setFinances(data.finances || []);
		} catch (err) {
			console.error("Error fetching finances:", err);
		} finally {
			setLoading(false);
		}
	};

	const getMonthName = (month: number) => {
		return format(new Date(2000, month - 1, 1), "MMMM");
	};

	const formatCurrency = (amount: number) => {
		return new Intl.NumberFormat("en-IN", {
			style: "currency",
			currency: "INR",
			maximumFractionDigits: 0,
		}).format(amount);
	};

	const handleBankSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setBankLoading(true);

		try {
			const res = await fetch("/api/profile", {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					bankName: bankFormData.bankName,
					accountNumber: bankFormData.accountNumber,
					ifscCode: bankFormData.ifscCode,
				}),
			});

			const data = await res.json();

			if (!res.ok) {
				toast.error(data.error || "Failed to save bank details");
				setBankLoading(false);
				return;
			}

			toast.success("Bank details saved successfully");
			setUser(data.user);
			setShowBankForm(false);
			setBankLoading(false);
		} catch (err: any) {
			toast.error(err.message || "An error occurred");
			setBankLoading(false);
		}
	};

	const handleShowSalaryClick = () => {
		if (showSalary) {
			// If already showing, just hide it
			setShowSalary(false);
		} else {
			// If hidden, show password modal
			setShowPasswordModal(true);
			setPassword("");
			setPasswordError("");
		}
	};

	const handlePasswordVerify = async (e: React.FormEvent) => {
		e.preventDefault();
		setPasswordError("");
		setVerifyingPassword(true);

		try {
			const res = await fetch("/api/auth/verify-password", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ password }),
			});

			const data = await res.json();

			if (!res.ok) {
				setPasswordError(data.error || "Incorrect password");
				setVerifyingPassword(false);
				return;
			}

			// Password verified successfully
			setShowPasswordModal(false);
			setShowSalary(true);
			setPassword("");
			setPasswordError("");
			setVerifyingPassword(false);
			toast.success("Password verified successfully");
		} catch (err: any) {
			setPasswordError(err.message || "An error occurred");
			setVerifyingPassword(false);
		}
	};

	const handleClosePasswordModal = () => {
		setShowPasswordModal(false);
		setPassword("");
		setPasswordError("");
		setVerifyingPassword(false);
	};

	// Calculate stats
	const baseSalary = finances.length > 0 ? finances[0].baseSalary : 0;
	const totalAnnualSalary = baseSalary * 12;

	return (
		<DashboardLayout role='hr'>
			<div className='min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50'>
				<div className='space-y-4 p-4 md:p-6'>
					{/* Header */}
					<div className='flex items-center justify-between'>
						<div className='flex items-center gap-3'>
							<div className='bg-gradient-to-br from-green-500 to-green-600 p-3 rounded-xl shadow-lg'>
								<Wallet className='w-5 h-5 text-white' />
							</div>
							<div>
								<h1 className='text-xl font-primary font-bold text-gray-800'>
									My Salary
								</h1>
								<p className='text-xs text-gray-600 mt-0.5 font-secondary'>
									View your salary information and payslips
								</p>
							</div>
						</div>
						<button
							onClick={handleShowSalaryClick}
							className='flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-lg border border-white/50 hover:shadow-lg transition-all font-secondary text-sm font-medium text-gray-700'
							title={showSalary ? "Hide salary" : "Show salary"}>
							{showSalary ? (
								<>
									<EyeOff className='w-4 h-4' />
									<span>Hide</span>
								</>
							) : (
								<>
									<Eye className='w-4 h-4' />
									<span>Show</span>
								</>
							)}
						</button>
					</div>

					{/* Stats Cards */}
					<div className='grid grid-cols-2 md:grid-cols-3 gap-4'>
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							className='bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-white/50 hover:shadow-xl transition-shadow'>
							<div className='flex items-center justify-between'>
								<div className='flex-1'>
									<p className='text-xs text-gray-600 font-secondary mb-1'>
										Base Salary
									</p>
									<p
										className={`text-xl sm:text-3xl font-primary font-bold text-gray-800 transition-all duration-300 ${
											!showSalary
												? "blur-md select-none"
												: ""
										}`}>
										{showSalary
											? formatCurrency(baseSalary)
											: "••••••"}
									</p>
								</div>
								<div className='bg-gradient-to-br from-green-500 to-green-600 p-2 rounded-xl shadow-lg'>
									<DollarSign className='w-6 h-6 text-white' />
								</div>
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 }}
							className='bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-white/50 hover:shadow-xl transition-shadow'>
							<div className='flex items-center justify-between'>
								<div className='flex-1'>
									<p className='text-xs text-gray-600 font-secondary mb-1'>
										Annual Salary
									</p>
									<p
										className={`text-xl sm:text-3xl font-primary font-bold text-gray-800 transition-all duration-300 ${
											!showSalary
												? "blur-md select-none"
												: ""
										}`}>
										{showSalary
											? formatCurrency(totalAnnualSalary)
											: "••••••"}
									</p>
								</div>
								<div className='bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-xl shadow-lg'>
									<Wallet className='w-6 h-6 text-white' />
								</div>
							</div>
						</motion.div>

						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.2 }}
							className='bg-white/80 backdrop-blur-sm rounded-xl shadow-lg p-5 border border-white/50 hover:shadow-xl transition-shadow hidden sm:block'>
							<div className='flex items-center justify-between'>
								<div>
									<p className='text-xs text-gray-600 font-secondary mb-1'>
										Currency
									</p>
									<p className='text-3xl font-primary font-bold text-gray-800'>
										INR
									</p>
								</div>
								<div className='bg-gradient-to-br from-purple-500 to-purple-600 p-2 rounded-xl shadow-lg'>
									<FileText className='w-6 h-6 text-white' />
								</div>
							</div>
						</motion.div>
					</div>

					{/* Bank Details Section */}
					<div className='bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-5'>
						<div className='flex items-center justify-between mb-4'>
							<div className='flex items-center gap-3'>
								<div className='bg-gradient-to-br from-primary to-purple-600 p-2.5 rounded-lg shadow-lg'>
									<CreditCard className='w-4 h-4 text-white' />
								</div>
								<div>
									<h2 className='text-lg font-primary font-bold text-gray-800'>
										Bank Details
									</h2>
									<p className='text-xs text-gray-600 font-secondary'>
										Manage your bank account information
									</p>
								</div>
							</div>
							{!showBankForm && (
								<button
									onClick={() => setShowBankForm(true)}
									className='px-4 py-2 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-secondary text-xs sm:text-sm font-medium'>
									{user?.accountNumber ? "Update" : "Add"}{" "}
									Bank Details
								</button>
							)}
						</div>

						{showBankForm ? (
							<form
								onSubmit={handleBankSubmit}
								className='space-y-3 mt-4'>
								<div className='grid grid-cols-1 md:grid-cols-3 gap-3'>
									<div>
										<label className='block text-xs font-semibold text-gray-700 mb-1.5 font-secondary'>
											Bank Name *
										</label>
										<input
											type='text'
											value={bankFormData.bankName}
											onChange={(e) =>
												setBankFormData({
													...bankFormData,
													bankName: e.target.value,
												})
											}
											required
											placeholder='Enter bank name'
											className='w-full px-3 py-2 text-sm text-gray-700 border border-gray-300/50 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none font-secondary bg-white/80 backdrop-blur-sm'
										/>
									</div>
									<div>
										<label className='block text-xs font-semibold text-gray-700 mb-1.5 font-secondary'>
											Account Number *
										</label>
										<input
											type='text'
											value={bankFormData.accountNumber}
											onChange={(e) =>
												setBankFormData({
													...bankFormData,
													accountNumber:
														e.target.value,
												})
											}
											required
											placeholder='Enter account number'
											className='w-full px-3 py-2 text-sm text-gray-700 border border-gray-300/50 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none font-secondary bg-white/80 backdrop-blur-sm'
										/>
									</div>
									<div>
										<label className='block text-xs font-semibold text-gray-700 mb-1.5 font-secondary'>
											IFSC Code *
										</label>
										<input
											type='text'
											value={bankFormData.ifscCode}
											onChange={(e) =>
												setBankFormData({
													...bankFormData,
													ifscCode:
														e.target.value.toUpperCase(),
												})
											}
											required
											placeholder='Enter IFSC code'
											maxLength={11}
											className='w-full px-3 py-2 text-sm text-gray-700 border border-gray-300/50 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none font-secondary bg-white/80 backdrop-blur-sm uppercase'
										/>
									</div>
								</div>
								<div className='flex gap-2 pt-2'>
									<button
										type='submit'
										disabled={bankLoading}
										className='flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg hover:shadow-lg transition-all font-secondary text-sm font-medium disabled:opacity-50'>
										{bankLoading ? (
											<>
												<LoadingDots
													size='sm'
													color='white'
												/>
												<span>Saving...</span>
											</>
										) : (
											<>
												<Save className='w-3.5 h-3.5' />
												Save
											</>
										)}
									</button>
									<button
										type='button'
										onClick={() => {
											setShowBankForm(false);
											setBankFormData({
												bankName: user?.bankName || "",
												accountNumber:
													user?.accountNumber || "",
												ifscCode: user?.ifscCode || "",
											});
										}}
										className='flex items-center gap-2 px-4 py-2 border border-gray-300/50 text-gray-700 rounded-lg hover:bg-gray-50/80 transition-all font-secondary text-sm font-medium'>
										<X className='w-3.5 h-3.5' />
										Cancel
									</button>
								</div>
							</form>
						) : user?.accountNumber ? (
							<div className='mt-3 grid grid-cols-1 md:grid-cols-3 gap-3'>
								<div className='p-3 bg-gray-50/50 rounded-lg border border-gray-100'>
									<div className='flex items-center gap-1.5 mb-1.5'>
										<Building2 className='w-3.5 h-3.5 text-gray-600' />
										<span className='text-xs text-gray-500 font-secondary'>
											Bank Name
										</span>
									</div>
									<p className='text-sm font-semibold text-gray-900 font-secondary'>
										{user.bankName}
									</p>
								</div>
								<div className='p-3 bg-gray-50/50 rounded-lg border border-gray-100'>
									<div className='flex items-center gap-1.5 mb-1.5'>
										<CreditCard className='w-3.5 h-3.5 text-gray-600' />
										<span className='text-xs text-gray-500 font-secondary'>
											Account Number
										</span>
									</div>
									<p className='text-sm font-semibold text-gray-900 font-secondary'>
										{user.accountNumber}
									</p>
								</div>
								<div className='p-3 bg-gray-50/50 rounded-lg border border-gray-100'>
									<div className='flex items-center gap-1.5 mb-1.5'>
										<FileText className='w-3.5 h-3.5 text-gray-600' />
										<span className='text-xs text-gray-500 font-secondary'>
											IFSC Code
										</span>
									</div>
									<p className='text-sm font-semibold text-gray-900 font-secondary'>
										{user.ifscCode}
									</p>
								</div>
							</div>
						) : (
							<div className='mt-3 p-3 bg-yellow-50/50 rounded-lg border border-yellow-200/50'>
								<p className='text-xs text-gray-600 font-secondary'>
									No bank details added yet. Click &quot;Add
									Bank Details&quot; to add your bank
									information.
								</p>
							</div>
						)}
					</div>

					{/* Salary Records */}
					{loading ? (
						<div className='bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-8 flex flex-col items-center justify-center'>
							<LoadingDots size='lg' className='mb-3' />
							<p className='text-xs text-gray-500 font-secondary'>
								Loading salary data...
							</p>
						</div>
					) : finances.length === 0 ? (
						<div className='bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-8 text-center'>
							<Wallet className='w-12 h-12 text-gray-400 mx-auto mb-3' />
							<p className='text-gray-600 font-secondary'>
								No salary records yet
							</p>
							<p className='text-xs text-gray-500 font-secondary mt-1'>
								Your salary information will appear here once
								allocated
							</p>
						</div>
					) : (
						<div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
							{finances.map((finance, index) => (
								<motion.div
									key={finance._id}
									initial={{ opacity: 0, y: 20 }}
									animate={{ opacity: 1, y: 0 }}
									transition={{ delay: index * 0.05 }}
									className='bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/50 p-5 hover:shadow-xl transition-shadow'>
									<div className='flex items-center justify-between mb-3'>
										<div className='flex items-center gap-2.5'>
											<div className='bg-gradient-to-br from-primary to-purple-600 p-2 rounded-lg shadow-lg'>
												<Calendar className='w-4 h-4 text-white' />
											</div>
											<div>
												<div className='font-semibold text-gray-900 font-primary text-sm'>
													{getMonthName(
														finance.month,
													)}{" "}
													{finance.year}
												</div>
												<div className='text-xs text-gray-500 font-secondary'>
													{format(
														new Date(
															finance.createdAt,
														),
														"MMM dd, yyyy",
													)}
												</div>
											</div>
										</div>
									</div>

									<div className='pt-3 border-t border-gray-200'>
										<div className='flex justify-between items-center'>
											<span className='text-sm font-semibold text-gray-700 font-primary'>
												Salary
											</span>
											<span
												className={`text-xl font-bold text-primary font-primary transition-all duration-300 ${
													!showSalary
														? "blur-md select-none"
														: ""
												}`}>
												{showSalary
													? formatCurrency(
															finance.baseSalary,
														)
													: "••••••"}
											</span>
										</div>
									</div>
								</motion.div>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Password Verification Modal */}
			<AnimatePresence>
				{showPasswordModal && (
					<div className='fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
						<motion.div
							initial={{ opacity: 0, scale: 0.95, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.95, y: 20 }}
							className='bg-white/80 backdrop-blur-xl rounded-xl shadow-2xl border border-white/50 p-5 w-full max-w-md'>
							<div className='flex items-center justify-between mb-5'>
								<div className='flex items-center gap-3'>
									<div className='bg-gradient-to-br from-primary to-purple-600 p-2.5 rounded-lg shadow-lg'>
										<Lock className='w-5 h-5 text-white' />
									</div>
									<div>
										<h2 className='text-xl font-primary font-bold text-gray-800'>
											Verify Password
										</h2>
										<p className='text-xs text-gray-600 font-secondary'>
											Enter your password to view salary
											details
										</p>
									</div>
								</div>
								<button
									onClick={handleClosePasswordModal}
									className='text-gray-400 hover:text-gray-600 transition-colors p-1.5 hover:bg-gray-100 rounded-lg'>
									<X className='w-5 h-5' />
								</button>
							</div>

							<form
								onSubmit={handlePasswordVerify}
								className='space-y-4'>
								<div>
									<label className='block text-xs font-semibold text-gray-700 mb-1.5 font-secondary'>
										Password *
									</label>
									<div className='relative'>
										<Lock className='absolute z-10 left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4' />
										<input
											type='password'
											value={password}
											onChange={(e) => {
												setPassword(e.target.value);
												setPasswordError("");
											}}
											required
											placeholder='Enter your password'
											className='w-full pl-10 pr-3 py-2 text-sm text-gray-700 border border-gray-300/50 rounded-lg focus:ring-2 focus:ring-primary/50 focus:border-primary/50 outline-none font-secondary bg-white/80 backdrop-blur-sm'
											autoFocus
										/>
									</div>
									{passwordError && (
										<p className='mt-1.5 text-xs text-red-600 font-secondary'>
											{passwordError}
										</p>
									)}
								</div>

								<div className='flex gap-2 pt-2'>
									<button
										type='button'
										onClick={handleClosePasswordModal}
										className='flex-1 px-4 py-2 text-sm border border-gray-300/50 rounded-lg text-gray-700 hover:bg-gray-50/80 transition-all font-secondary backdrop-blur-sm'>
										Cancel
									</button>
									<button
										type='submit'
										disabled={
											verifyingPassword || !password
										}
										className='flex-1 px-4 py-2 text-sm bg-gradient-to-r from-primary to-purple-600 text-white rounded-lg hover:shadow-lg transition-all disabled:opacity-50 font-secondary flex items-center justify-center gap-2 backdrop-blur-sm'>
										{verifyingPassword ? (
											<>
												<LoadingDots
													size='sm'
													color='white'
												/>
												<span>Verifying...</span>
											</>
										) : (
											<>
												<Lock className='w-3.5 h-3.5' />
												Verify
											</>
										)}
									</button>
								</div>
							</form>
						</motion.div>
					</div>
				)}
			</AnimatePresence>
		</DashboardLayout>
	);
}
