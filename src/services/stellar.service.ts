import * as StellarSdk from '@stellar/stellar-sdk';
import { config } from '../config/env';

export class StellarService {
    private server: StellarSdk.Server;

    constructor() {
        if (config.STELLAR_NETWORK === 'PUBLIC') {
            this.server = new StellarSdk.Server('https://horizon.stellar.org');
        } else {
            this.server = new StellarSdk.Server('https://horizon-testnet.stellar.org');
        }
    }

    public generateWallet() {
        const pair = StellarSdk.Keypair.random();
        return {
            publicKey: pair.publicKey(),
            secret: pair.secret(),
        };
    }

    public async checkBalance(publicKey: string): Promise<string> {
        try {
            const account = await this.server.loadAccount(publicKey);
            const balance = account.balances.find((b) => b.asset_type === 'native');
            return balance ? balance.balance : '0';
        } catch (error) {
            console.error('Error checking balance:', error);
            return 'Error checking balance or account not funded.';
        }
    }
}
