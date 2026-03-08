# Solana Mobile Wallet

A React Native mobile wallet for Solana blockchain with support for token management, swaps, and transfers.

## Features

- ✅ Import wallet via mnemonic (12/24 words) or private key
- ✅ Generate new wallet
- ✅ Display SOL balance
- ✅ Display all SPL tokens
- ✅ Swap tokens using Jupiter Aggregator
- ✅ Send SOL and SPL tokens
- ✅ NFT display and management
- ✅ View NFT details, attributes, and creators
- ✅ Transfer NFTs
- ✅ Transaction history with filtering and search
- ✅ View transaction details
- ✅ Export transaction history to CSV
- ✅ Biometric authentication (Fingerprint, Face ID, Iris)
- ✅ Secure app lock with biometric unlock
- ✅ Secure key storage with expo-secure-store

## Tech Stack

- React Native + Expo
- TypeScript
- @solana/web3.js
- @solana/spl-token
- Jupiter Aggregator API
- React Native Paper (UI)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install additional required package:
```bash
npm install ed25519-hd-key babel-plugin-module-resolver
```

3. Start the development server:
```bash
npm start
```

4. Run on Android:
```bash
npm run android
```

5. Run on iOS (Mac only):
```bash
npm run ios
```

## Project Structure

```
solana-mobile-wallet/
├── app/                    # Expo Router pages
│   ├── _layout.tsx        # Root layout
│   ├── index.tsx          # Import wallet page
│   ├── home.tsx           # Main wallet page
│   ├── swap.tsx           # Swap page
│   ├── send.tsx           # Send tokens page
│   ├── nfts.tsx           # NFT list page
│   ├── nft-detail.tsx     # NFT detail page
│   ├── transactions.tsx   # Transaction history page
│   └── transaction-detail.tsx  # Transaction detail page
├── src/
│   ├── services/          # Core services
│   │   ├── walletService.ts
│   │   ├── tokenService.ts
│   │   ├── swapService.ts
│   │   ├── nftService.ts
│   │   ├── transactionService.ts
│   │   └── storageService.ts
│   ├── components/        # UI components
│   │   ├── TokenList.tsx
│   │   ├── WalletBalance.tsx
│   │   ├── NFTGrid.tsx
│   │   └── TransactionList.tsx
│   ├── types/            # TypeScript types
│   └── constants/        # Configuration
└── package.json
```

## Usage

### Import Wallet

1. Launch the app
2. Choose "Mnemonic" or "Private Key"
3. Enter your credentials
4. Tap "Import Wallet"

### Generate New Wallet

1. Launch the app
2. Tap "Generate New Wallet"
3. **IMPORTANT**: Save the mnemonic phrase shown
4. Tap "I have saved it"

### View Balances

- SOL balance is displayed at the top
- Scroll down to see all SPL tokens
- Pull down to refresh

### Swap Tokens

1. Tap "Swap" button
2. Enter input token mint address
3. Enter output token mint address
4. Enter amount
5. Tap "Get Quote" to see swap details
6. Tap "Execute Swap" to complete

### Send Tokens

1. Tap "Send" button
2. Enter recipient address
3. Enter amount
4. For SOL: Tap "Send SOL"
5. For SPL tokens: Enter token mint and tap "Send Token"

### View NFTs

1. Tap "View NFTs" button on home page
2. Browse your NFT collection in grid view
3. Use search bar to find specific NFTs
4. Filter by collection using the tabs
5. Pull down to refresh

### NFT Details

1. Tap any NFT to view details
2. See full image, description, and attributes
3. View creator information
4. Transfer NFT to another wallet
5. View on Solscan explorer

### Transaction History

1. Tap "Transaction History" button on home page
2. View all your transactions
3. Filter by type (Send, Receive, Swap, NFT)
4. Search transactions by signature, address, or token
5. Tap any transaction to view details
6. Export to CSV for record keeping

### Transaction Details

1. View complete transaction information
2. Copy transaction signature
3. Share transaction link
4. View on Solscan explorer

## Common Token Addresses

- **SOL**: `So11111111111111111111111111111111111111112`
- **USDC**: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`
- **USDT**: `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB`

## Configuration

Edit `src/constants/config.ts` to change:
- Network (mainnet-beta / devnet)
- RPC endpoint
- Jupiter API URL

## Security

- Private keys are encrypted using expo-secure-store
- Keys never leave the device
- All transactions are signed locally
- No private keys are logged

## Development

### Testing on Devnet

Change network in `src/constants/config.ts`:
```typescript
export const NETWORK = 'devnet';
```

Get devnet SOL from: https://faucet.solana.com/

### Building for Production

```bash
# Android
npm run android --variant=release

# iOS
npm run ios --configuration Release
```

## Troubleshooting

### "Invalid mnemonic phrase"
- Ensure mnemonic is 12 or 24 words
- Check for extra spaces
- Words should be separated by single spaces

### "Failed to get tokens"
- Check internet connection
- RPC endpoint might be rate-limited
- Try using a paid RPC provider (Helius, QuickNode)

### "Failed to execute swap"
- Ensure sufficient SOL for transaction fees
- Check token balances
- Increase slippage tolerance

### "NFTs not loading"
- Check if RPC endpoint supports DAS API
- Try using Helius or QuickNode RPC
- Legacy method will be used as fallback

### "NFT images not showing"
- Check internet connection
- IPFS images may load slowly
- Try refreshing the page

### "Transaction history not loading"
- Check internet connection
- RPC endpoint might be rate-limited
- Try reducing the number of transactions to load
- Use a paid RPC provider for better performance

### "Biometric authentication not working"
- Check if device supports biometric authentication
- Ensure biometric is enrolled in device settings
- Try re-enabling biometric in app settings
- Restart the app

## Future Enhancements

- [ ] 0 fee transactions (fee payer server)
- [x] NFT display and management
- [x] Transaction history
- [x] Biometric authentication
- [ ] Password backup unlock
- [ ] NFT marketplace integration
- [ ] Advanced transaction analytics
- [ ] Multiple wallet support
- [ ] DApp browser
- [ ] Staking support
- [ ] Price charts
- [ ] QR code scanner

## License

MIT

## Disclaimer

This is a development wallet. Use at your own risk. Always backup your mnemonic phrase.
