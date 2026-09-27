// Player's Manual banking, scaled to Meridian Wake's economy and travel-day clock.
export const newBankAccount = () => ({
	score: 400,
	rate: 0.0008,
	term: 365,
	income: [],
	paid: 0,
	missed: 0,
	statement: null,
});

export const bankMethods = {
	recordIncome(amount) {
		const bank = this.state.bank;
		bank.income = bank.income.filter(
			(entry) => entry.day > this.state.day - 100,
		);
		let entry = bank.income.find((entry) => entry.day === this.state.day);
		if (!entry) {
			entry = { day: this.state.day, amount: 0 };
			bank.income.push(entry);
		}
		entry.amount += Math.round(amount);
	},
	bankStatus() {
		const bank = this.state.bank;
		const income = bank.income
			.filter(
				(entry) =>
					entry.day > this.state.day - 100 && entry.day <= this.state.day,
			)
			.reduce((sum, entry) => sum + entry.amount, 0);
		const averageIncome = Math.max(0, Math.floor(income / 100));
		const newRate =
			bank.score >= 700
				? 0.0004
				: bank.score >= 500
					? 0.0006
					: bank.score >= 300
						? 0.0008
						: 0.0012;
		const allowance =
			bank.score < 300
				? 0
				: Math.max(
						0,
						Math.min(
							2500000,
							Math.floor((averageIncome * 365 * 0.65 - this.state.debt) / 100) *
								100,
						),
					);
		const interest = Math.ceil(this.state.debt * bank.rate);
		const installment = this.state.debt
			? Math.min(
					this.state.debt + interest,
					Math.ceil(this.state.debt / Math.max(1, bank.term)) + interest,
				)
			: 0;
		return {
			...bank,
			averageIncome,
			allowance,
			newRate,
			interest,
			installment,
			wages:
				this.state.extraCrew * 15 +
				this.state.escorts.filter((e) => !e.temporary).length * 90,
		};
	},
	settleBankDay() {
		const bank = this.state.bank;
		const { wages } = this.bankStatus();
		this.spend(wages);
		if (wages) this.recordIncome(-wages);
		const { interest, installment } = this.bankStatus();
		this.state.debt += interest;
		let payment = 0;
		if (installment && this.state.credits >= installment) {
			payment = installment;
			this.state.credits -= payment;
			this.state.debt -= payment;
			bank.score = Math.min(800, bank.score + 1);
			bank.term = Math.max(1, bank.term - 1);
			bank.paid++;
		} else if (installment) {
			bank.score = Math.max(200, bank.score - 5);
			bank.missed++;
			this.log(
				"Mortgage payment missed",
				`Day ${this.state.day}: ${installment.toLocaleString()} credits due. Interest was added to the balance; credit rating is now ${bank.score}.`,
			);
		} else {
			// A captain who pays off a troubled account can rebuild credit without borrowing.
			bank.score = Math.min(800, bank.score + 1);
		}
		bank.statement = {
			day: this.state.day,
			wages,
			interest,
			payment,
			missed: installment > 0 && payment === 0,
		};
	},
	borrow(amount) {
		if (this.state.mode !== "port" || !this.currentSystem().inhabited)
			return this.fail("Visit a bank at an inhabited spaceport first.");
		if (!Number.isSafeInteger(amount) || amount < 100)
			return this.fail("Choose a whole-credit loan of at least 100 credits.");
		const quote = this.bankStatus();
		if (amount > quote.allowance)
			return this.fail(
				`The bank can offer up to ${quote.allowance.toLocaleString()} credits based on your rating, existing debt and the last 100 days of operating income.`,
			);
		const principal = this.state.debt;
		this.state.bank.rate =
			(principal * this.state.bank.rate + amount * quote.newRate) /
			(principal + amount);
		this.state.bank.term = 365;
		this.state.debt += amount;
		this.state.credits += amount;
		this.log(
			"Loan approved",
			`${amount.toLocaleString()} credits borrowed. Daily payment is now ${this.bankStatus().installment.toLocaleString()} credits. Borrowed funds do not count as income.`,
		);
		return this.success(
			`Loan approved: ${amount.toLocaleString()} credits. The first payment falls due on the next travel day.`,
		);
	},
};
