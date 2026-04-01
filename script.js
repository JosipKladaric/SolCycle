document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    document.getElementById('year').textContent = new Date().getFullYear();

    // Configuration - 4 Deterministic Wallets
    const TREASURY_WALLETS = {
        '1h': "Cc2FQ1s3iAjUQ9aJEyTKRmE4eYvVeF2Lzfc8aRXAos9s",
        '24h': "AwhKTZzQaE8kTD4v9vcQjyzwxELKkkBBjHaUwjXv2eC8",
        '7d': "8SuCjr72UMyvBdD7VGox1EDZtfc2VKCeEYNk4EwBY8JZ",
        '1y': "5HWGKZcAbaoFk1vpDCFyCc9ruJP6d9jDTypQckinr1uw"
    };
    
    // Solana Web3 Variables
    let userWalletAddress = null;
    let liveSolPriceUsd = 145.00; // Fallback

    // DOM Elements
    const donationInput = document.getElementById('donationAmount');
    const displayAmount = document.getElementById('displayAmount');
    const donateBtn = document.getElementById('donateBtn');
    const connectBtn = document.getElementById('connectWalletBtn');
    
    const splits = {
        '1h': document.getElementById('split-1h'),
        '24h': document.getElementById('split-24h'),
        '7d': document.getElementById('split-7d'),
        '1y': document.getElementById('split-1y')
    };

    const pots = {
        '1h': document.getElementById('pot-1h'),
        '24h': document.getElementById('pot-24h'),
        '7d': document.getElementById('pot-7d'),
        '1y': document.getElementById('pot-1y')
    };

    const parts = {
        '1h': document.getElementById('parts-1h'),
        '24h': document.getElementById('parts-24h'),
        '7d': document.getElementById('parts-7d'),
        '1y': document.getElementById('parts-1y')
    };

    const timers = {
        '1h': document.getElementById('time-1h'),
        '24h': document.getElementById('time-24h'),
        '7d': document.getElementById('time-7d'),
        '1y': document.getElementById('time-1y')
    };

    // Calculate Exact Deterministic UTC Timestamps
    const getNextEndTimes = () => {
        const now = new Date();
        
        // Top of the Hour
        const nextHour = new Date(now);
        nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);

        // Midnight UTC
        const nextDay = new Date(now);
        nextDay.setUTCDate(now.getUTCDate() + 1);
        nextDay.setUTCHours(0, 0, 0, 0);

        // Sunday Midnight UTC (0 = Sunday in Javascript)
        const nextSunday = new Date(now);
        const daysToAdd = now.getUTCDay() === 0 ? 7 : 7 - now.getUTCDay();
        nextSunday.setUTCDate(now.getUTCDate() + daysToAdd);
        nextSunday.setUTCHours(0, 0, 0, 0);
        
        // Jan 1st Midnight UTC
        const nextYear = new Date(now);
        nextYear.setUTCFullYear(now.getUTCFullYear() + 1, 0, 1);
        nextYear.setUTCHours(0, 0, 0, 0);

        return {
            '1h': nextHour.getTime(),
            '24h': nextDay.getTime(),
            '7d': nextSunday.getTime(),
            '1y': nextYear.getTime()
        };
    };

    // Global State
    let gameState = {
        pots: { '1h': 42.50, '24h': 892.25, '7d': 3450.00, '1y': 12400.00 },
        parts: { '1h': 8, '24h': 124, '7d': 840, '1y': 4305 },
        endTimes: getNextEndTimes()
    };

    // Fetch live SOL price from CoinGecko
    const fetchSolPrice = async () => {
        try {
            const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
            const data = await res.json();
            if (data.solana && data.solana.usd) {
                liveSolPriceUsd = data.solana.usd;
            }
        } catch (err) {
            console.error("Failed to fetch SOL price, using fallback.", err);
        }
    };
    fetchSolPrice(); // Run immediately

    // Sync with Solana Blockchain directly using getMultipleAccountsInfo
    const syncState = async () => {
        try {
            if (TREASURY_WALLETS['1h'] === "WALLET_1_ADDRESS_HERE") {
                throw new Error("Wallets not configured yet");
            }

            const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'));
            
            const pubkeys = [
                new solanaWeb3.PublicKey(TREASURY_WALLETS['1h']),
                new solanaWeb3.PublicKey(TREASURY_WALLETS['24h']),
                new solanaWeb3.PublicKey(TREASURY_WALLETS['7d']),
                new solanaWeb3.PublicKey(TREASURY_WALLETS['1y'])
            ];

            const accounts = await connection.getMultipleAccountsInfo(pubkeys);
            
            // Reconstruct the pot sizes (in USD) directly from live SOL balances
            gameState.pots['1h'] = (accounts[0] ? (accounts[0].lamports / solanaWeb3.LAMPORTS_PER_SOL) : 0) * liveSolPriceUsd;
            gameState.pots['24h'] = (accounts[1] ? (accounts[1].lamports / solanaWeb3.LAMPORTS_PER_SOL) : 0) * liveSolPriceUsd;
            gameState.pots['7d'] = (accounts[2] ? (accounts[2].lamports / solanaWeb3.LAMPORTS_PER_SOL) : 0) * liveSolPriceUsd;
            gameState.pots['1y'] = (accounts[3] ? (accounts[3].lamports / solanaWeb3.LAMPORTS_PER_SOL) : 0) * liveSolPriceUsd;
            
            // Roughly estimate participants by assuming an average historical donation was across a $10 input ($2.50 per pot)
            // This avoids making massive historical RPC queries to track unique sender addresses on the frontend.
            gameState.parts['1h'] = Math.floor(gameState.pots['1h'] / 2.50) || 1;
            gameState.parts['24h'] = Math.floor(gameState.pots['24h'] / 2.50) || 1;
            gameState.parts['7d'] = Math.floor(gameState.pots['7d'] / 2.50) || 1;
            gameState.parts['1y'] = Math.floor(gameState.pots['1y'] / 2.50) || 1;

        } catch (err) {
            // Using offline mock data so the site still looks alive until your Master Wallets are pasted in!
            const fakeDonation = Math.floor(Math.random() * 5) + 1;
            gameState.pots['1h'] += fakeDonation * 0.25;
            gameState.pots['24h'] += fakeDonation * 0.25;
            gameState.pots['7d'] += fakeDonation * 0.25;
            gameState.pots['1y'] += fakeDonation * 0.25;
            
            if (Math.random() > 0.4) {
                gameState.parts['1h'] += 1;
                gameState.parts['24h'] += 1;
                gameState.parts['7d'] += 1;
                gameState.parts['1y'] += 1;
            }
        }
        
        // Always refresh dynamic end times to ensure perfect clock sync
        gameState.endTimes = getNextEndTimes();
        updatePotUI();
    };

    // Update state every 15s to sync with blockchain
    setInterval(syncState, 15000); 

    // Split logic
    const updateSplits = (amount) => {
        const val = parseFloat(amount);
        if (isNaN(val) || val < 1) {
            displayAmount.textContent = `$0.00`;
            Object.values(splits).forEach(el => el.textContent = '$0.00');
            return;
        }

        displayAmount.textContent = `$${val.toFixed(2)}`;
        splits['1h'].textContent = `$${(val * 0.25).toFixed(2)}`;
        splits['24h'].textContent = `$${(val * 0.25).toFixed(2)}`;
        splits['7d'].textContent = `$${(val * 0.25).toFixed(2)}`;
        splits['1y'].textContent = `$${(val * 0.25).toFixed(2)}`;
    };

    updateSplits(donationInput.value);

    donationInput.addEventListener('input', (e) => {
        updateSplits(e.target.value);
    });

    // Formatting currency
    const formatCurrency = (val) => `$${val.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

    // Initialize Pot UI
    const updatePotUI = () => {
        // Display net payable amount (90% of pot, reserving 10% for dev fund)
        const formatPot = (usdVal) => {
            const solVal = liveSolPriceUsd > 0 ? usdVal / liveSolPriceUsd : 0;
            return formatCurrency(usdVal) + ` <span class="sol-amount">(${solVal.toFixed(3)} SOL)</span>`;
        };

        pots['1h'].innerHTML = formatPot(gameState.pots['1h'] * 0.9);
        pots['24h'].innerHTML = formatPot(gameState.pots['24h'] * 0.9);
        pots['7d'].innerHTML = formatPot(gameState.pots['7d'] * 0.9);
        pots['1y'].innerHTML = formatPot(gameState.pots['1y'] * 0.9);
        
        parts['1h'].textContent = Math.floor(gameState.parts['1h']).toLocaleString('en-US');
        parts['24h'].textContent = Math.floor(gameState.parts['24h']).toLocaleString('en-US');
        parts['7d'].textContent = Math.floor(gameState.parts['7d']).toLocaleString('en-US');
        parts['1y'].textContent = Math.floor(gameState.parts['1y']).toLocaleString('en-US');
    };
    updatePotUI();

    // --- Web3 Real Implementations --- //

    // Connect Wallet
    connectBtn.addEventListener('click', async () => {
        if (!window.solana || !window.solana.isPhantom) {
            alert('Phantom Wallet not found! Please install the Phantom extension.');
            return;
        }

        if (userWalletAddress) {
            // Disconnect
            await window.solana.disconnect();
            userWalletAddress = null;
            connectBtn.textContent = 'Connect Wallet';
            connectBtn.style = '';
            return;
        }

        try {
            connectBtn.textContent = 'Connecting...';
            const resp = await window.solana.connect();
            userWalletAddress = resp.publicKey.toString();
            
            connectBtn.textContent = `${userWalletAddress.slice(0, 4)}...${userWalletAddress.slice(-4)}`;
            connectBtn.style.background = 'rgba(255,255,255,0.1)';
            connectBtn.style.border = '1px solid var(--sol-green)';
            connectBtn.style.boxShadow = 'none';
        } catch (err) {
            console.error('Wallet connection failed', err);
            connectBtn.textContent = 'Connect Wallet';
        }
    });

    // Donate Button
    donateBtn.addEventListener('click', async () => {
        const usdValue = parseFloat(donationInput.value);
        if (isNaN(usdValue) || usdValue < 1) {
            alert('Minimum donation is $1.');
            return;
        }

        if (!userWalletAddress || !window.solana) {
            alert('Please connect your Phantom Wallet first by clicking Connect at the top right.');
            return;
        }

        if (TREASURY_WALLETS['1h'] === "WALLET_1_ADDRESS_HERE") {
            alert('Simulation Warning: The 4 Treasury Wallets were not configured yet. Paste 4 Solana wallet addresses into TREASURY_WALLETS in your script.js file to go perfectly live!');
            return;
        }

        const originalText = donateBtn.textContent;
        donateBtn.textContent = 'Confirming Transaction...';
        donateBtn.style.opacity = '0.7';
        donateBtn.disabled = true;

        try {
            // Connect to Solana Mainnet
            const connection = new solanaWeb3.Connection(solanaWeb3.clusterApiUrl('mainnet-beta'));

            // Calculate Lamports needed per split (25% to each of the 4 wallets)
            const splitUsdValue = usdValue / 4;
            const splitSolNeeded = splitUsdValue / liveSolPriceUsd;
            const splitLamports = Math.floor(splitSolNeeded * solanaWeb3.LAMPORTS_PER_SOL);

            // Construct exactly ONE transaction that holds exactly FOUR transfers
            const tx = new solanaWeb3.Transaction();
            
            Object.values(TREASURY_WALLETS).forEach(walletAddr => {
                tx.add(
                    solanaWeb3.SystemProgram.transfer({
                        fromPubkey: window.solana.publicKey,
                        toPubkey: new solanaWeb3.PublicKey(walletAddr),
                        lamports: splitLamports
                    })
                );
            });

            // Fetch blockhash
            const { blockhash } = await connection.getLatestBlockhash();
            tx.recentBlockhash = blockhash;
            tx.feePayer = window.solana.publicKey;

            // Prompt Phantom to sign and send the multi-transfer transaction
            const { signature } = await window.solana.signAndSendTransaction(tx);
            await connection.confirmTransaction(signature);

            alert(`Success! Successfully entered all 4 cycles with a single transaction of ${(splitSolNeeded * 4).toFixed(4)} SOL ($${usdValue.toFixed(2)}).`);
            
            // Snap UI immediately to new values until next RPC polling happens
            gameState.pots['1h'] += splitUsdValue;
            gameState.pots['24h'] += splitUsdValue;
            gameState.pots['7d'] += splitUsdValue;
            gameState.pots['1y'] += splitUsdValue;
            
            gameState.parts['1h'] += 1;
            gameState.parts['24h'] += 1;
            gameState.parts['7d'] += 1;
            gameState.parts['1y'] += 1;
            updatePotUI();

            donateBtn.textContent = 'Donation Successful!';
            donateBtn.style.background = 'var(--sol-green)';
            
            setTimeout(() => {
                donateBtn.textContent = originalText;
                donateBtn.style = '';
                donateBtn.disabled = false;
                donateBtn.style.opacity = '1';
                donationInput.value = '10';
                updateSplits('10');
            }, 3000);

        } catch (err) {
            console.error(err);
            alert('Transaction Failed or Rejected by user.');
            donateBtn.textContent = originalText;
            donateBtn.disabled = false;
            donateBtn.style.opacity = '1';
        }
    });

    const formatTime = (timeDiff, includeDays = false) => {
        if (timeDiff <= 0) return '00:00:00';
        
        const days = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((timeDiff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((timeDiff % (1000 * 60)) / 1000);

        const h = hours.toString().padStart(2, '0');
        const m = minutes.toString().padStart(2, '0');
        const s = seconds.toString().padStart(2, '0');

        if (includeDays && days > 0) {
            return `${days}d ${h}:${m}:${s}`;
        }
        
        return `${(hours + (days * 24)).toString().padStart(2, '0')}:${m}:${s}`;
    };

    setInterval(() => {
        const currentTime = new Date().getTime();
        
        timers['1h'].textContent = formatTime(gameState.endTimes['1h'] - currentTime);
        timers['24h'].textContent = formatTime(gameState.endTimes['24h'] - currentTime);
        timers['7d'].textContent = formatTime(gameState.endTimes['7d'] - currentTime, true);
        timers['1y'].textContent = formatTime(gameState.endTimes['1y'] - currentTime, true);
    }, 1000);

    // Copy wallet address (Mock)
    const walletCopy = document.getElementById('walletAddress');
    if(walletCopy) {
        walletCopy.addEventListener('click', () => {
            navigator.clipboard.writeText("To inject 4 wallets via QR or copy, use website UI.").then(() => {
                const originalText = walletCopy.textContent;
                walletCopy.textContent = 'Copied!';
                walletCopy.style.color = 'var(--sol-green)';
                setTimeout(() => {
                    walletCopy.textContent = originalText;
                    walletCopy.style.color = '';
                }, 2000);
            });
        });
    }
});
