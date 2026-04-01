# ◎ SolCycle 

**SolCycle** is a fully decentralized, continuous prize pool ecosystem built on the Solana blockchain. It leverages a serverless frontend architecture connected directly to Solana RPC nodes, alongside an autonomous Python-based treasury bot that conducts mathematically verifiable weighted lotteries at deterministic UTC timeframes.

## 🌟 The Ecosystem

SolCycle is split into **4 concurrent time-locked pools**, distributing every donation perfectly evenly to give players short-term action and long-term massive bounties:
- **1-Hour Cycle:** Fast-paced action. Ends precisely at the top of every global hour. (Rollover protection: requires 10 unique participants or the pot safely carries over).
- **24-Hour Cycle:** Daily draw. Ends strictly at Midnight UTC.
- **7-Day Cycle:** Weekly draw. Ends strictly at Sunday Midnight UTC.
- **1-Year Cycle:** The grand jackpot. Ends strictly on December 31st Midnight UTC.

Every time a user deposits (e.g., $10 USD), the frontend executes a **Custom 4-Way Multi-Transfer** directly on the blockchain via Phantom Wallet. The user signs one single transaction, but their SOL is beamed exactly 25% into each of the 4 independent Treasury smart wallets.

## 🏗 Architecture

Because SolCycle relies exclusively on the Solana Ledger as its central database, there are **Zero Database Hosting Costs**.

### 1. The Frontend (Serverless Web App)
- **Tech Stack:** Vanilla HTML5, CSS3 Glassmorphism UI, Vanilla JavaScript (`@solana/web3.js`).
- **Functionality:** Every 15 seconds, the website natively `getMultipleAccountsInfo()` queries the 4 Master Treasury Wallets on the live mainnet. It multiplies the blockchain LAMPORT balances by real-time CoinGecko API prices to display perfectly synced live USD/SOL pots. 
- **Deterministic Timers:** Timers do not rely on central servers. They use pure math against the global UNIX clock to count down to the deterministic UTC deadlines, guaranteeing the frontend and backend payout engine never de-sync.

### 2. The Backend Treasury Command Center (Python Daemon)
- **Tech Stack:** Python 3.11+, `customtkinter`, `solders`, `solana`.
- **Functionality:** An elegant dark-mode desktop GUI that passively crunches the exact same UTC deadlines. When a countdown hits `00:00:00`, the bot initiates the **True Lottery Execution Protocol**.
- **The Execution Protocol:**
  - Employs infinite-scroll pagination to scrape blockchain signatures backward in chunks of 1000.
  - Dynamically stops parsing history the second it spots a previous "Payout Checkpoint" from itself, structurally encapsulating all participants (even across massive months-long rollovers).
  - Calculates 1 Ticket per 1 Lamport deposited by tracing inner instruction inputs.
  - Mathematically generates a verifiable random winner cryptographically favored by deposit weight.
  - Retains precisely 10% of the pot for the Dev Treasury and builds a unified multi-payout `VersionedTransaction` transferring 90% straight to the winner's wallet.
