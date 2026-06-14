// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract LendingPool is ReentrancyGuard, Ownable, ERC20 {
    
    uint256 public totalDeposited;
    uint256 public totalBorrowed;
    uint256 public constant BORROW_RATE = 5;
    uint256 public constant LIQUIDATION_THRESHOLD = 75;
    uint256 public constant LIQUIDATION_BONUS = 5;
    uint256 public ethPrice = 100;
    
    mapping(address => uint256) public deposits;
    mapping(address => uint256) public borrows;
    mapping(address => uint256) public collateral;
    mapping(address => uint256) public borrowTimestamp;
    
    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event Borrowed(address indexed user, uint256 amount, uint256 collateralAmount);
    event Repaid(address indexed user, uint256 amount);
    event Liquidated(address indexed borrower, address indexed liquidator, uint256 amount);
    event PriceUpdated(uint256 newPrice);
    
    constructor() ERC20("Lending ETH", "lETH") {}
    
    function setEthPrice(uint256 newPrice) external  {
        ethPrice = newPrice;
        emit PriceUpdated(newPrice);
    }
    
    function deposit() external payable nonReentrant {
        require(msg.value > 0, "Must deposit more than 0");
        deposits[msg.sender] += msg.value;
        totalDeposited += msg.value;
        _mint(msg.sender, msg.value);
        emit Deposited(msg.sender, msg.value);
    }
    
    function withdraw(uint256 amount) external nonReentrant {
        require(amount > 0, "Must withdraw more than 0");
        require(deposits[msg.sender] >= amount, "Insufficient deposit");
        require(address(this).balance >= amount, "Insufficient pool liquidity");
        deposits[msg.sender] -= amount;
        totalDeposited -= amount;
        _burn(msg.sender, amount);
        payable(msg.sender).transfer(amount);
        emit Withdrawn(msg.sender, amount);
    }
    
    function borrow(uint256 borrowAmount) external payable nonReentrant {
        require(msg.value > 0, "Must provide collateral");
        require(borrowAmount > 0, "Must borrow more than 0");
        require(borrows[msg.sender] == 0, "Repay existing loan first");
        uint256 collateralValue = (msg.value * ethPrice) / 100;
        uint256 maxBorrow = (collateralValue * LIQUIDATION_THRESHOLD) / 100;
        require(borrowAmount <= maxBorrow, "Insufficient collateral");
        require(address(this).balance >= borrowAmount, "Insufficient pool liquidity");
        collateral[msg.sender] += msg.value;
        borrows[msg.sender] = borrowAmount;
        borrowTimestamp[msg.sender] = block.timestamp;
        totalBorrowed += borrowAmount;
        payable(msg.sender).transfer(borrowAmount);
        emit Borrowed(msg.sender, borrowAmount, msg.value);
    }
    
    function repay() external payable nonReentrant {
        require(borrows[msg.sender] > 0, "No active loan");
        uint256 interest = calculateInterest(msg.sender);
        uint256 totalOwed = borrows[msg.sender] + interest;
        require(msg.value >= totalOwed, "Insufficient repayment amount");
        uint256 collateralToReturn = collateral[msg.sender];
        totalBorrowed -= borrows[msg.sender];
        borrows[msg.sender] = 0;
        collateral[msg.sender] = 0;
        borrowTimestamp[msg.sender] = 0;
        payable(msg.sender).transfer(collateralToReturn);
        emit Repaid(msg.sender, msg.value);
    }
    
    function liquidate(address borrower) external nonReentrant {
        require(borrows[borrower] > 0, "No active loan");
        require(isLiquidatable(borrower), "Loan is healthy");
        uint256 debt = borrows[borrower] + calculateInterest(borrower);
        uint256 collateralToSeize = collateral[borrower];
        uint256 bonus = (collateralToSeize * LIQUIDATION_BONUS) / 100;
        totalBorrowed -= borrows[borrower];
        borrows[borrower] = 0;
        collateral[borrower] = 0;
        borrowTimestamp[borrower] = 0;
        payable(msg.sender).transfer(bonus);
        emit Liquidated(borrower, msg.sender, debt);
    }
    
    function calculateInterest(address user) public view returns (uint256) {
        if (borrows[user] == 0) return 0;
        uint256 timeElapsed = block.timestamp - borrowTimestamp[user];
        uint256 interest = (borrows[user] * BORROW_RATE * timeElapsed) / (100 * 365 days);
        return interest;
    }
    
    function isLiquidatable(address user) public view returns (bool) {
        if (borrows[user] == 0) return false;
        uint256 collateralValue = (collateral[user] * ethPrice) / 100;
        uint256 maxBorrow = (collateralValue * LIQUIDATION_THRESHOLD) / 100;
        uint256 totalDebt = borrows[user] + calculateInterest(user);
        return totalDebt > maxBorrow;
    }
    
    function getHealthFactor(address user) public view returns (uint256) {
        if (borrows[user] == 0) return 200;
        uint256 collateralValue = (collateral[user] * ethPrice) / 100;
        uint256 maxBorrow = (collateralValue * LIQUIDATION_THRESHOLD) / 100;
        uint256 totalDebt = borrows[user] + calculateInterest(user);
        if (totalDebt == 0) return 200;
        return (maxBorrow * 100) / totalDebt;
    }
    
    function getPoolStats() external view returns (uint256, uint256, uint256) {
        return (totalDeposited, totalBorrowed, address(this).balance);
    }
}