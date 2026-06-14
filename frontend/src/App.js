import { useState } from "react";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const CONTRACT_ABI = [
    "function deposit() external payable",
    "function withdraw(uint256 amount) external",
    "function borrow(uint256 borrowAmount) external payable",
    "function repay() external payable",
    "function liquidate(address borrower) external",
    "function deposits(address) view returns (uint256)",
    "function borrows(address) view returns (uint256)",
    "function collateral(address) view returns (uint256)",
    "function getHealthFactor(address) view returns (uint256)",
    "function isLiquidatable(address) view returns (bool)",
    "function calculateInterest(address) view returns (uint256)",
    "function getPoolStats() view returns (uint256, uint256, uint256)",
    "function balanceOf(address) view returns (uint256)",
    "function setEthPrice(uint256 newPrice) external",
    "function ethPrice() view returns (uint256)",
];

export default function App() {
    const [account, setAccount] = useState("");
    const [contract, setContract] = useState(null);
    const [depositAmount, setDepositAmount] = useState("");
    const [borrowAmount, setBorrowAmount] = useState("");
    const [collateralAmount, setCollateralAmount] = useState("");
    const [liquidateAddress, setLiquidateAddress] = useState("");
    const [activeTab, setActiveTab] = useState("deposit");
    const [userStats, setUserStats] = useState({
        deposit: "0",
        borrow: "0",
        collateral: "0",
        healthFactor: "0",
        leth: "0",
        interest: "0",
    });
    const [poolStats, setPoolStats] = useState({
        totalDeposited: "0",
        totalBorrowed: "0",
        balance: "0",
    });
    const [ethPrice, setEthPriceState] = useState("100");
    const [status, setStatus] = useState("");
    const [statusType, setStatusType] = useState("success");
    const [loading, setLoading] = useState(false);

    async function connectWallet() {
        if (!window.ethereum) { alert("Please install MetaMask!"); return; }
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const c = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        setAccount(accounts[0]);
        setContract(c);
        setStatus("Wallet connected successfully!");
        setStatusType("success");
        await loadStats(c, accounts[0]);
    }

    async function loadStats(c, addr) {
        try {
            const dep = await c.deposits(addr);
            const bor = await c.borrows(addr);
            const col = await c.collateral(addr);
            const hf = await c.getHealthFactor(addr);
            const leth = await c.balanceOf(addr);
            const interest = await c.calculateInterest(addr);
            const [td, tb, bal] = await c.getPoolStats();
            const price = await c.ethPrice();
            setUserStats({
                deposit: ethers.formatEther(dep),
                borrow: ethers.formatEther(bor),
                collateral: ethers.formatEther(col),
                healthFactor: hf.toString(),
                leth: ethers.formatEther(leth),
                interest: ethers.formatEther(interest),
            });
            setPoolStats({
                totalDeposited: ethers.formatEther(td),
                totalBorrowed: ethers.formatEther(tb),
                balance: ethers.formatEther(bal),
            });
            setEthPriceState(price.toString());
        } catch (e) { console.log(e); }
    }

    async function handleDeposit() {
        if (!contract) return;
        setLoading(true);
        try {
            const tx = await contract.deposit({ value: ethers.parseEther(depositAmount) });
            setStatus("Transaction submitted. Waiting for confirmation...");
            setStatusType("pending");
            await tx.wait();
            setStatus("Deposit successful! lETH tokens minted to your wallet.");
            setStatusType("success");
            await loadStats(contract, account);
            setDepositAmount("");
        } catch (e) { setStatus("Error: " + e.message);
            setStatusType("error"); }
        setLoading(false);
    }

    async function handleWithdraw() {
        if (!contract) return;
        setLoading(true);
        try {
            const dep = await contract.deposits(account);
            const tx = await contract.withdraw(dep);
            setStatus("Withdrawing...");
            setStatusType("pending");
            await tx.wait();
            setStatus("Withdrawal successful!");
            setStatusType("success");
            await loadStats(contract, account);
        } catch (e) { setStatus("Error: " + e.message);
            setStatusType("error"); }
        setLoading(false);
    }

    async function handleBorrow() {
        if (!contract) return;
        setLoading(true);
        try {
            const tx = await contract.borrow(ethers.parseEther(borrowAmount), { value: ethers.parseEther(collateralAmount) });
            setStatus("Transaction submitted. Waiting for confirmation...");
            setStatusType("pending");
            await tx.wait();
            setStatus("Borrow successful! ETH sent to your wallet.");
            setStatusType("success");
            await loadStats(contract, account);
            setBorrowAmount("");
            setCollateralAmount("");
        } catch (e) { setStatus("Error: " + e.message);
            setStatusType("error"); }
        setLoading(false);
    }

    async function handleRepay() {
        if (!contract) return;
        setLoading(true);
        try {
            const borrow = await contract.borrows(account);
            const interest = await contract.calculateInterest(account);
            const total = borrow + interest + ethers.parseEther("0.001");
            const tx = await contract.repay({ value: total });
            setStatus("Repaying loan...");
            setStatusType("pending");
            await tx.wait();
            setStatus("Loan repaid! Collateral returned to your wallet.");
            setStatusType("success");
            await loadStats(contract, account);
        } catch (e) { setStatus("Error: " + e.message);
            setStatusType("error"); }
        setLoading(false);
    }

    async function handleCrashPrice() {
        if (!contract) return;
        setLoading(true);
        try {
            const tx = await contract.setEthPrice(50);
            setStatus("Simulating ETH price crash to 50%...");
            setStatusType("pending");
            await tx.wait();
            setStatus("Price crashed! Health factors updated. Loans are now liquidatable!");
            setStatusType("error");
            await loadStats(contract, account);
        } catch (e) { setStatus("Error: " + e.message);
            setStatusType("error"); }
        setLoading(false);
    }

    async function handleRestorePrice() {
        if (!contract) return;
        setLoading(true);
        try {
            const tx = await contract.setEthPrice(100);
            setStatus("Restoring ETH price to normal...");
            setStatusType("pending");
            await tx.wait();
            setStatus("Price restored to normal!");
            setStatusType("success");
            await loadStats(contract, account);
        } catch (e) { setStatus("Error: " + e.message);
            setStatusType("error"); }
        setLoading(false);
    }

    async function handleLiquidate() {
        if (!contract) return;
        setLoading(true);
        try {
            const tx = await contract.liquidate(liquidateAddress);
            setStatus("Liquidating position...");
            setStatusType("pending");
            await tx.wait();
            setStatus("Liquidation successful! Bonus sent to your wallet.");
            setStatusType("success");
            await loadStats(contract, account);
        } catch (e) { setStatus("Error: " + e.message);
            setStatusType("error"); }
        setLoading(false);
    }

    const hf = parseInt(userStats.healthFactor);
    const hfColor = hf >= 150 ? "#00ff88" : hf >= 100 ? "#ffaa00" : "#ff4444";
    const hfLabel = hf >= 150 ? "SAFE" : hf >= 100 ? "WARNING" : "DANGER";
    const utilization = poolStats.totalDeposited > 0 ?
        ((parseFloat(poolStats.totalBorrowed) / parseFloat(poolStats.totalDeposited)) * 100).toFixed(1) :
        "0.0";
    const statusColor = statusType === "success" ? "#00ff88" : statusType === "error" ? "#ff4444" : "#ffaa00";

    return ( <
        div style = { s.app } >
        <
        div style = { s.bgGrid } > < /div>

        <
        div style = { s.header } >
        <
        div style = { s.logo } >
        <
        div style = { s.logoGlow } > ◈ < /div> <
        span style = { s.logoText } > DeFi < span style = { s.accent } > Lend < /span></span >
        <
        span style = { s.logoBadge } > TESTNET < /span> <
        /div> <
        div style = { s.headerCenter } >
        <
        div style = { s.headerStat } >
        <
        span style = { s.headerStatLabel } > TVL < /span> <
        span style = { s.headerStatValue } > { parseFloat(poolStats.balance).toFixed(2) }
        ETH < /span> <
        /div> <
        div style = { s.headerDivider } > < /div> <
        div style = { s.headerStat } >
        <
        span style = { s.headerStatLabel } > APY < /span> <
        span style = { s.headerStatValue } > 5.00 % < /span> <
        /div> <
        div style = { s.headerDivider } > < /div> <
        div style = { s.headerStat } >
        <
        span style = { s.headerStatLabel } > ETH PRICE < /span> <
        span style = {
            {...s.headerStatValue, color: parseInt(ethPrice) < 100 ? "#ff4444" : "#00ff88" } } > { ethPrice } %
        <
        /span> <
        /div> <
        div style = { s.headerDivider } > < /div> <
        div style = { s.headerStat } >
        <
        span style = { s.headerStatLabel } > UTILIZATION < /span> <
        span style = { s.headerStatValue } > { utilization } % < /span> <
        /div> <
        /div> {
            account ? ( <
                div style = { s.accountBadge } >
                <
                div style = { s.greenDot } > < /div> <
                span > { account.slice(0, 6) }... { account.slice(-4) } < /span> <
                /div>
            ) : ( <
                button style = { s.connectBtn }
                onClick = { connectWallet } > ◈Connect Wallet < /button>
            )
        } <
        /div>

        {
            status && ( <
                div style = {
                    {...s.statusBar, borderColor: statusColor, color: statusColor } } >
                <
                span > ● < /span> {status} <
                /div>
            )
        }

        <
        div style = { s.poolRow } > {
            [
                { label: "TOTAL DEPOSITED", value: parseFloat(poolStats.totalDeposited).toFixed(4) + " ETH", color: "#00ff88" },
                { label: "TOTAL BORROWED", value: parseFloat(poolStats.totalBorrowed).toFixed(4) + " ETH", color: "#00aaff" },
                { label: "POOL LIQUIDITY", value: parseFloat(poolStats.balance).toFixed(4) + " ETH", color: "#aa88ff" },
                { label: "BORROW RATE", value: "5.00% APR", color: "#ffaa00" },
                { label: "LTV RATIO", value: "75%", color: "#ff6688" },
                { label: "LIQ. BONUS", value: "5%", color: "#00ffcc" },
            ].map((item, i) => ( <
                div key = { i }
                style = { s.poolCard } >
                <
                div style = { s.poolLabel } > { item.label } < /div> <
                div style = {
                    {...s.poolValue, color: item.color } } > { item.value } < /div> <
                /div>
            ))
        } <
        /div>

        <
        div style = { s.main } > {
            account && ( <
                div style = { s.positionPanel } >
                <
                div style = { s.panelHeader } >
                <
                span style = { s.panelTitle } > ◈YOUR POSITION < /span> <
                /div>

                <
                div style = {
                    {...s.hfCard, borderColor: hfColor + "44" } } >
                <
                div style = { s.hfTop } >
                <
                span style = { s.hfLabel } > HEALTH FACTOR < /span> <
                span style = {
                    {...s.hfBadge, background: hfColor + "22", color: hfColor, border: `1px solid ${hfColor}44` } } > { hfLabel } < /span> <
                /div> <
                div style = {
                    {...s.hfNumber, color: hfColor } } > { userStats.healthFactor } < /div> <
                div style = { s.hfBar } >
                <
                div style = {
                    {...s.hfBarFill, width: Math.min(hf, 200) / 2 + "%", background: hfColor } } > < /div> <
                /div> <
                div style = { s.hfDesc } > {
                    hf >= 150 ? "Your position is healthy and safe from liquidation" :
                        hf >= 100 ? "Warning: Consider repaying to avoid liquidation" :
                        "Critical: Your position can be liquidated!"
                } <
                /div> <
                /div>

                <
                div style = { s.positionGrid } > {
                    [
                        { label: "Deposited", value: parseFloat(userStats.deposit).toFixed(4) + " ETH", color: "#00ff88" },
                        { label: "lETH Tokens", value: parseFloat(userStats.leth).toFixed(4) + " lETH", color: "#aa88ff" },
                        { label: "Borrowed", value: parseFloat(userStats.borrow).toFixed(4) + " ETH", color: "#00aaff" },
                        { label: "Collateral", value: parseFloat(userStats.collateral).toFixed(4) + " ETH", color: "#ffaa00" },
                        { label: "Interest Owed", value: parseFloat(userStats.interest).toFixed(6) + " ETH", color: "#ff6688" },
                        { label: "Max Borrow", value: (parseFloat(userStats.collateral) * 0.75).toFixed(4) + " ETH", color: "#00ffcc" },
                    ].map((item, i) => ( <
                        div key = { i }
                        style = { s.posCard } >
                        <
                        div style = { s.posLabel } > { item.label } < /div> <
                        div style = {
                            {...s.posValue, color: item.color } } > { item.value } < /div> <
                        /div>
                    ))
                } <
                /div> <
                /div>
            )
        }

        <
        div style = { s.actionsPanel } > {!account ? ( <
                div style = { s.connectPrompt } >
                <
                div style = { s.connectIcon } > ◈ < /div> <
                div style = { s.connectTitle } > Connect Your Wallet < /div> <
                div style = { s.connectDesc } > Connect MetaMask to start lending and borrowing on the decentralized protocol < /div> <
                button style = { s.connectBtnBig }
                onClick = { connectWallet } > Connect Wallet < /button> <
                /div>
            ) : ( <
                >
                <
                div style = { s.tabs } > {
                    ["deposit", "borrow", "liquidate"].map(tab => ( <
                        button key = { tab }
                        style = {
                            {...s.tab, ...(activeTab === tab ? s.activeTab : {}) } }
                        onClick = {
                            () => setActiveTab(tab) } >
                        { tab === "deposit" ? "◈ DEPOSIT" : tab === "borrow" ? "◈ BORROW" : "◈ LIQUIDATE" } <
                        /button>
                    ))
                } <
                /div>

                {
                    activeTab === "deposit" && ( <
                        div style = { s.tabContent } >
                        <
                        div style = { s.tabTitle } > Deposit ETH to earn yield < /div> <
                        div style = { s.tabDesc } > Deposit ETH into the lending pool and receive lETH tokens.Earn 5 % APY from borrower interest. < /div> <
                        div style = { s.inputGroup } >
                        <
                        label style = { s.inputLabel } > DEPOSIT AMOUNT < /label> <
                        div style = { s.inputWrapper } >
                        <
                        input style = { s.input }
                        type = "number"
                        placeholder = "0.00"
                        value = { depositAmount }
                        onChange = { e => setDepositAmount(e.target.value) }
                        /> <
                        span style = { s.inputSuffix } > ETH < /span> <
                        /div> <
                        /div> <
                        button style = { s.primaryBtn }
                        onClick = { handleDeposit }
                        disabled = { loading } > { loading ? "⟳ Processing..." : "◈ Deposit ETH" } <
                        /button> <
                        div style = { s.divider } > < /div> <
                        div style = { s.tabTitle } > Withdraw ETH < /div> <
                        div style = { s.tabDesc } > Burn your lETH tokens to withdraw your deposited ETH plus earned interest. < /div> <
                        button style = { s.secondaryBtn }
                        onClick = { handleWithdraw }
                        disabled = { loading } > { loading ? "⟳ Processing..." : "◈ Withdraw All ETH" } <
                        /button> <
                        /div>
                    )
                }

                {
                    activeTab === "borrow" && ( <
                        div style = { s.tabContent } >
                        <
                        div style = { s.tabTitle } > Borrow ETH against collateral < /div> <
                        div style = { s.tabDesc } > Lock ETH as collateral and borrow up to 75 % of its value.Keep health factor above 100 to avoid liquidation. < /div> <
                        div style = { s.inputGroup } >
                        <
                        label style = { s.inputLabel } > COLLATERAL AMOUNT < /label> <
                        div style = { s.inputWrapper } >
                        <
                        input style = { s.input }
                        type = "number"
                        placeholder = "0.00"
                        value = { collateralAmount }
                        onChange = { e => setCollateralAmount(e.target.value) }
                        /> <
                        span style = { s.inputSuffix } > ETH < /span> <
                        /div> <
                        /div> <
                        div style = { s.inputGroup } >
                        <
                        label style = { s.inputLabel } > BORROW AMOUNT(MAX 75 % OF COLLATERAL) < /label> <
                        div style = { s.inputWrapper } >
                        <
                        input style = { s.input }
                        type = "number"
                        placeholder = "0.00"
                        value = { borrowAmount }
                        onChange = { e => setBorrowAmount(e.target.value) }
                        /> <
                        span style = { s.inputSuffix } > ETH < /span> <
                        /div> <
                        /div> {
                            collateralAmount && ( <
                                div style = { s.infoBox } >
                                Max borrowable: < span style = {
                                    { color: "#00ff88" } } > {
                                    (parseFloat(collateralAmount || 0) * 0.75).toFixed(4) }
                                ETH < /span> <
                                /div>
                            )
                        } <
                        button style = { s.primaryBtn }
                        onClick = { handleBorrow }
                        disabled = { loading } > { loading ? "⟳ Processing..." : "◈ Borrow ETH" } <
                        /button> <
                        div style = { s.divider } > < /div> <
                        div style = { s.tabTitle } > Repay Loan < /div> <
                        div style = { s.tabDesc } > Repay your borrowed ETH plus interest to unlock your collateral. < /div> <
                        button style = {
                            {...s.secondaryBtn, borderColor: "#ffaa00", color: "#ffaa00" } }
                        onClick = { handleRepay }
                        disabled = { loading } > { loading ? "⟳ Processing..." : "◈ Repay Full Loan" } <
                        /button> <
                        /div>
                    )
                }

                {
                    activeTab === "liquidate" && ( <
                        div style = { s.tabContent } >
                        <
                        div style = { s.tabTitle } > Simulate Price Crash < /div> <
                        div style = { s.tabDesc } > Simulate ETH price dropping 50 % to trigger liquidations.This shows how the protocol protects lenders automatically. < /div> <
                        button style = {
                            {...s.primaryBtn, background: "linear-gradient(135deg, #ff6600, #cc4400)" } }
                        onClick = { handleCrashPrice }
                        disabled = { loading } > { loading ? "⟳ Processing..." : "◈ Crash ETH Price -50%" } <
                        /button> <
                        button style = { s.secondaryBtn }
                        onClick = { handleRestorePrice }
                        disabled = { loading } > { loading ? "⟳ Processing..." : "◈ Restore Normal Price" } <
                        /button> <
                        div style = { s.divider } > < /div> <
                        div style = { s.tabTitle } > Liquidate Unhealthy Position < /div> <
                        div style = { s.tabDesc } > After price crash, enter borrower address below and liquidate.Earn 5 % bonus reward. < /div> <
                        div style = { s.warningBox } > ⚠Only positions with health factor below 100 can be liquidated <
                        /div> <
                        div style = { s.inputGroup } >
                        <
                        label style = { s.inputLabel } > BORROWER ADDRESS TO LIQUIDATE < /label> <
                        input style = {
                            {...s.input, width: "100%", boxSizing: "border-box", border: "1px solid #1a1a3a", borderRadius: "8px", padding: "12px 16px" } }
                        type = "text"
                        placeholder = "0x..."
                        value = { liquidateAddress }
                        onChange = { e => setLiquidateAddress(e.target.value) }
                        /> <
                        /div> <
                        button style = {
                            {...s.primaryBtn, background: "linear-gradient(135deg, #ff4444, #cc0000)" } }
                        onClick = { handleLiquidate }
                        disabled = { loading } > { loading ? "⟳ Processing..." : "◈ Liquidate Position" } <
                        /button> <
                        /div>
                    )
                } <
                />
            )
        } <
        /div> <
        /div>

        <
        div style = { s.footer } >
        <
        span style = { s.footerText } > ◈DeFiLend Protocol• Decentralized Lending on Ethereum• All transactions are on - chain and immutable < /span> <
        /div> <
        /div>
    );
}

const s = {
    app: { minHeight: "100vh", background: "#080810", color: "#c0c0d0", fontFamily: "'Courier New', monospace", position: "relative", overflow: "hidden" },
    bgGrid: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundImage: "linear-gradient(#0d0d2000 1px, transparent 1px), linear-gradient(90deg, #0d0d2000 1px, transparent 1px)", backgroundSize: "40px 40px", zIndex: 0, pointerEvents: "none" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 32px", borderBottom: "1px solid #1a1a3a", background: "#0a0a18", position: "relative", zIndex: 10 },
    logo: { display: "flex", alignItems: "center", gap: "10px" },
    logoGlow: { fontSize: "24px", color: "#00ff88", textShadow: "0 0 20px #00ff88" },
    logoText: { fontSize: "22px", fontWeight: "bold", color: "#fff", letterSpacing: "1px" },
    accent: { color: "#00ff88" },
    logoBadge: { fontSize: "9px", background: "#00ff8822", color: "#00ff88", border: "1px solid #00ff8844", padding: "2px 8px", borderRadius: "4px", letterSpacing: "2px" },
    headerCenter: { display: "flex", alignItems: "center", gap: "24px" },
    headerStat: { display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" },
    headerStatLabel: { fontSize: "9px", color: "#444", letterSpacing: "2px" },
    headerStatValue: { fontSize: "14px", color: "#00ff88", fontWeight: "bold" },
    headerDivider: { width: "1px", height: "30px", background: "#1a1a3a" },
    accountBadge: { display: "flex", alignItems: "center", gap: "8px", background: "#0d1a0d", border: "1px solid #00ff8844", padding: "8px 16px", borderRadius: "8px", color: "#00ff88", fontSize: "13px" },
    greenDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#00ff88", boxShadow: "0 0 8px #00ff88" },
    connectBtn: { background: "transparent", border: "1px solid #00ff88", color: "#00ff88", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontFamily: "'Courier New', monospace", fontSize: "13px", letterSpacing: "1px" },
    statusBar: { padding: "10px 32px", borderBottom: "1px solid", fontSize: "12px", background: "#0a0a18", position: "relative", zIndex: 10 },
    poolRow: { display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "1px", background: "#1a1a3a", borderBottom: "1px solid #1a1a3a", position: "relative", zIndex: 10 },
    poolCard: { background: "#0a0a18", padding: "16px 20px" },
    poolLabel: { fontSize: "9px", color: "#444", letterSpacing: "2px", marginBottom: "6px" },
    poolValue: { fontSize: "15px", fontWeight: "bold" },
    main: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0", minHeight: "calc(100vh - 200px)", position: "relative", zIndex: 10 },
    positionPanel: { borderRight: "1px solid #1a1a3a", padding: "24px" },
    panelHeader: { marginBottom: "20px" },
    panelTitle: { fontSize: "11px", color: "#00ff88", letterSpacing: "3px" },
    hfCard: { border: "1px solid", borderRadius: "12px", padding: "20px", marginBottom: "20px", background: "#0a0a18" },
    hfTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" },
    hfLabel: { fontSize: "9px", color: "#444", letterSpacing: "2px" },
    hfBadge: { fontSize: "10px", padding: "3px 10px", borderRadius: "4px", letterSpacing: "2px" },
    hfNumber: { fontSize: "56px", fontWeight: "bold", lineHeight: 1, marginBottom: "12px" },
    hfBar: { height: "4px", background: "#1a1a3a", borderRadius: "2px", marginBottom: "10px" },
    hfBarFill: { height: "100%", borderRadius: "2px", transition: "width 0.5s ease" },
    hfDesc: { fontSize: "11px", color: "#666" },
    positionGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
    posCard: { background: "#0a0a18", border: "1px solid #1a1a3a", borderRadius: "8px", padding: "14px" },
    posLabel: { fontSize: "9px", color: "#444", letterSpacing: "2px", marginBottom: "6px" },
    posValue: { fontSize: "14px", fontWeight: "bold" },
    actionsPanel: { padding: "24px" },
    connectPrompt: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: "16px", textAlign: "center", padding: "40px" },
    connectIcon: { fontSize: "64px", color: "#00ff88", textShadow: "0 0 40px #00ff88" },
    connectTitle: { fontSize: "24px", color: "#fff", fontWeight: "bold" },
    connectDesc: { fontSize: "13px", color: "#666", maxWidth: "300px", lineHeight: 1.8 },
    connectBtnBig: { background: "linear-gradient(135deg, #00ff88, #00cc6a)", color: "#080810", border: "none", padding: "14px 32px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "15px", fontFamily: "'Courier New', monospace", letterSpacing: "1px", marginTop: "8px" },
    tabs: { display: "flex", gap: "4px", marginBottom: "24px", background: "#0a0a18", padding: "4px", borderRadius: "8px", border: "1px solid #1a1a3a" },
    tab: { flex: 1, padding: "10px", background: "transparent", border: "none", color: "#444", cursor: "pointer", fontFamily: "'Courier New', monospace", fontSize: "11px", letterSpacing: "1px", borderRadius: "6px" },
    activeTab: { background: "#00ff8822", color: "#00ff88", border: "1px solid #00ff8844" },
    tabContent: { display: "flex", flexDirection: "column", gap: "14px" },
    tabTitle: { fontSize: "14px", color: "#fff", fontWeight: "bold" },
    tabDesc: { fontSize: "12px", color: "#555", lineHeight: 1.7 },
    inputGroup: { display: "flex", flexDirection: "column", gap: "6px" },
    inputLabel: { fontSize: "9px", color: "#444", letterSpacing: "2px" },
    inputWrapper: { display: "flex", alignItems: "center", background: "#0a0a18", border: "1px solid #1a1a3a", borderRadius: "8px", overflow: "hidden" },
    input: { flex: 1, background: "transparent", border: "none", padding: "12px 16px", color: "#e0e0e0", fontSize: "16px", fontFamily: "'Courier New', monospace", outline: "none" },
    inputSuffix: { padding: "0 16px", color: "#444", fontSize: "13px", borderLeft: "1px solid #1a1a3a" },
    infoBox: { background: "#0d1a0d", border: "1px solid #00ff8822", borderRadius: "6px", padding: "10px 14px", fontSize: "12px", color: "#888" },
    warningBox: { background: "#1a0d00", border: "1px solid #ffaa0044", borderRadius: "6px", padding: "10px 14px", fontSize: "12px", color: "#ffaa00" },
    primaryBtn: { background: "linear-gradient(135deg, #00ff88, #00cc6a)", color: "#080810", border: "none", padding: "14px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px", fontFamily: "'Courier New', monospace", letterSpacing: "1px" },
    secondaryBtn: { background: "transparent", color: "#00ff88", border: "1px solid #00ff8844", padding: "14px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold", fontSize: "14px", fontFamily: "'Courier New', monospace", letterSpacing: "1px" },
    divider: { height: "1px", background: "#1a1a3a", margin: "4px 0" },
    footer: { borderTop: "1px solid #1a1a3a", padding: "16px 32px", textAlign: "center", position: "relative", zIndex: 10 },
    footerText: { fontSize: "10px", color: "#333", letterSpacing: "2px" },
};