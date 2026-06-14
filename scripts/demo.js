const { ethers } = require("hardhat");

async function main() {
    console.log("===========================================");
    console.log("   DEFI LENDING PLATFORM - LIVE DEMO");
    console.log("===========================================\n");

    // Get accounts
    const [owner, priya, rahul, vikram] = await ethers.getSigners();
    console.log("Accounts loaded:");
    console.log("Priya (Lender):", priya.address);
    console.log("Rahul (Borrower):", rahul.address);
    console.log("Vikram (Liquidator):", vikram.address);
    console.log("\n-------------------------------------------\n");

    // Deploy contract
    console.log("Deploying LendingPool contract...");
    const LendingPool = await ethers.getContractFactory("LendingPool");
    const pool = await LendingPool.deploy();
    await pool.waitForDeployment();
    console.log("Contract deployed at:", await pool.getAddress());
    console.log("\n-------------------------------------------\n");

    // STEP 1 - Priya deposits 10 ETH
    console.log("STEP 1: Priya deposits 10 ETH into the pool");
    const depositTx = await pool.connect(priya).deposit({
        value: ethers.parseEther("10")
    });
    await depositTx.wait();

    const priyaDeposit = await pool.deposits(priya.address);
    const poolBalance = await ethers.provider.getBalance(await pool.getAddress());
    console.log("Priya deposited:", ethers.formatEther(priyaDeposit), "ETH");
    console.log("Pool balance:", ethers.formatEther(poolBalance), "ETH");
    console.log("Priya received lETH tokens:", ethers.formatEther(await pool.balanceOf(priya.address)), "lETH");
    console.log("\n-------------------------------------------\n");

    // STEP 2 - Rahul borrows 5 ETH with 8 ETH collateral
    console.log("STEP 2: Rahul locks 8 ETH collateral and borrows 5 ETH");
    const borrowTx = await pool.connect(rahul).borrow(
        ethers.parseEther("5"), { value: ethers.parseEther("8") }
    );
    await borrowTx.wait();

    const rahulBorrow = await pool.borrows(rahul.address);
    const rahulCollateral = await pool.collateral(rahul.address);
    console.log("Rahul borrowed:", ethers.formatEther(rahulBorrow), "ETH");
    console.log("Rahul collateral locked:", ethers.formatEther(rahulCollateral), "ETH");

    const healthFactor = await pool.getHealthFactor(rahul.address);
    console.log("Rahul health factor:", healthFactor.toString(), "(above 100 = safe)");
    console.log("\n-------------------------------------------\n");

    // STEP 3 - Check pool stats
    console.log("STEP 3: Pool Statistics");
    const [totalDeposited, totalBorrowed, balance] = await pool.getPoolStats();
    console.log("Total Deposited:", ethers.formatEther(totalDeposited), "ETH");
    console.log("Total Borrowed:", ethers.formatEther(totalBorrowed), "ETH");
    console.log("Pool Balance:", ethers.formatEther(balance), "ETH");
    console.log("\n-------------------------------------------\n");

    // STEP 4 - Check if liquidatable
    console.log("STEP 4: Checking if Rahul loan is liquidatable");
    const liquidatable = await pool.isLiquidatable(rahul.address);
    console.log("Is Rahul liquidatable?", liquidatable);
    console.log("(false = loan is safe, collateral covers the loan)");
    console.log("\n-------------------------------------------\n");

    // STEP 5 - Rahul repays loan
    console.log("STEP 5: Rahul repays his loan");
    const interest = await pool.calculateInterest(rahul.address);
    const totalOwed = rahulBorrow + interest + ethers.parseEther("0.001");

    const repayTx = await pool.connect(rahul).repay({
        value: totalOwed
    });
    await repayTx.wait();

    console.log("Rahul repaid successfully!");
    console.log("Rahul remaining borrow:", ethers.formatEther(await pool.borrows(rahul.address)), "ETH");
    console.log("Rahul collateral returned:", ethers.formatEther(await pool.collateral(rahul.address)), "ETH");
    console.log("\n-------------------------------------------\n");

    // STEP 6 - Priya withdraws
    console.log("STEP 6: Priya withdraws her deposit");
    const withdrawTx = await pool.connect(priya).withdraw(
        ethers.parseEther("10")
    );
    await withdrawTx.wait();

    console.log("Priya withdrew successfully!");
    console.log("Priya remaining deposit:", ethers.formatEther(await pool.deposits(priya.address)), "ETH");
    console.log("\n-------------------------------------------\n");

    console.log("===========================================");
    console.log("   DEMO COMPLETE - ALL FUNCTIONS WORKING");
    console.log("===========================================");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });