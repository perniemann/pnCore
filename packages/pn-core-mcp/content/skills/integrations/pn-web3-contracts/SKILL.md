---
name: pn-web3-contracts
description: Guides Solidity contracts, tests, and frontend integration. Use when writing Web3 contracts; covers contract patterns, security checklist, testing, deployment, and wallet/chain integration.
---

# Web3 contracts skill

## When to use

- Writing or auditing Solidity smart contracts
- Setting up Hardhat or Foundry tests
- Integrating wallets (ethers.js, viem, wagmi) in frontends
- Deploying or upgrading contracts
- Gas optimization or security review

## Solidity patterns

- **Contract structure:** Separate logic from storage; use libraries for reusable logic. Keep contracts focused.
- **Modifiers:** Use for access control and validation. Avoid complex logic in modifiers; prefer internal functions.
- **Event emission:** Emit events for all state-changing operations. Index parameters for filtering. Use NatSpec for documentation.
- **Gas optimization:** Pack storage variables; use `calldata` for read-only params; batch operations; avoid unbounded loops.
- **Visibility:** Use explicit `public`, `external`, `internal`, `private`. Prefer `external` for public functions when params are read-only.

## Security checklist

- **Reentrancy:** Use Checks-Effects-Interactions; consider ReentrancyGuard for external calls. Never trust external contract state mid-call.
- **Overflow:** Solidity 0.8+ has built-in overflow checks. For 0.7 and below, use SafeMath or explicit checks.
- **Access control:** Use Ownable, AccessControl, or custom roles. Restrict sensitive functions. Avoid `tx.origin`; use `msg.sender`.
- **tx.origin vs msg.sender:** Never use `tx.origin` for authorization; use `msg.sender`. `tx.origin` can be spoofed via intermediate contract.
- **Delegatecall:** Understand storage layout when using proxy patterns. Delegatecall runs in caller's context.
- **External calls:** Assume failure; handle revert. Use pull-over-push for payments when possible.
- **No private keys:** Never hardcode keys, mnemonics, or secrets. Use env vars, vaults, or signers for deployment and scripts.

## Testing patterns

- **Hardhat/Foundry:** Use unit tests for each function; integration tests for flows. Structure: arrange, act, assert.
- **Fuzz testing:** Use Foundry's `vm.assume` and property-based tests for invariants. Fuzz inputs to find edge cases.
- **Fork testing:** Fork mainnet/testnet when testing against real protocols. Use `vm.createSelectFork`.
- **Mocking:** Mock external contracts with interfaces. Use minimal implementations for dependencies.
- **Coverage:** Run coverage; aim for critical paths. Document untested edge cases.

## Frontend integration

- **viem / wagmi / ethers.js:** Use viem or ethers for contract calls. wagmi provides React hooks for connection, balance, and transactions.
- **Wallet connection:** Support MetaMask, WalletConnect, Coinbase Wallet. Handle chain switching and account changes.
- **Transaction lifecycle:** Show pending, success, error states. Handle user rejection (revert). Use receipt for confirmation.
- **Error handling:** Parse revert reasons when possible. Provide user-friendly messages for common errors (insufficient funds, rejected, wrong network).
- **RPC URLs:** Use env vars for RPC endpoints. Never commit API keys or private RPC URLs.

## Deployment

- **Deterministic deploys:** Use CREATE2 or same nonce for reproducible addresses when needed.
- **Proxy patterns:** UUPS or Transparent proxy for upgradeability. Document upgrade process and storage layout compatibility.
- **Verification:** Verify on Etherscan/equivalent after deploy. Use constructor args encoding correctly.
- **Upgrade safety:** Test upgrades on fork; ensure storage layout compatibility; run migration scripts.

## Output

- Secure, well-tested contract code with events and access control.
- Frontend integration with proper error handling and no hardcoded secrets.
- Reference pn-web3-security rule for mandatory checks. For read-only chain queries, configure an Ethereum RPC MCP externally if needed.
