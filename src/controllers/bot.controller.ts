import type { Request, Response } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import { StellarService } from '../services/stellar.service';
import { UserService } from '../services/user.service';
import { config } from '../config/env';

const whatsappService = new WhatsAppService();
const stellarService = new StellarService();
const userService = new UserService();

export class BotController {
    public verifyWebhook(req: Request, res: Response) {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];

        if (mode && token) {
            if (mode === 'subscribe' && token === config.VERIFY_TOKEN) {
                console.log('WEBHOOK_VERIFIED');
                res.status(200).send(challenge);
            } else {
                res.sendStatus(403);
            }
        } else {
            res.sendStatus(400);
        }
    }

    public async handleMessage(req: Request, res: Response) {
        const body = req.body;
        
        if (body.object) {
            if (
                body.entry &&
                body.entry[0].changes &&
                body.entry[0].changes[0] &&
                body.entry[0].changes[0].value.messages &&
                body.entry[0].changes[0].value.messages[0]
            ) {
                const phoneNumberId = body.entry[0].changes[0].value.metadata.phone_number_id;
                const from = body.entry[0].changes[0].value.messages[0].from;
                const msgBody = body.entry[0].changes[0].value.messages[0].text?.body || '';

                if (msgBody) {
                    console.log(`Received message from ${from}: ${msgBody}`);
                    
                    // Auto-register user
                    const user = await userService.getOrCreateUser(from);

                    await this.processCommand(from, msgBody, user);
                }
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    }

    private async processCommand(from: string, text: string, user: any) {
        const tokens = text.trim().split(/\s+/);
        if (tokens.length === 0) return;

        const cmd1 = tokens[0].toUpperCase();
        const cmd2 = tokens.length > 1 ? tokens[1].toUpperCase() : '';

        try {
            // Group Commands
            if (cmd1 === 'CREATE' && cmd2 === 'GROUP') {
                return await this.handleCreateGroup(from, tokens.slice(2));
            } else if (cmd1 === 'JOIN' && cmd2 === 'GROUP') {
                return await this.handleJoinGroup(from, tokens.slice(2));
            } else if (cmd1 === 'INVITE' && cmd2 === 'MEMBER') {
                return await this.handleInviteMember(from, tokens.slice(2));
            } else if (cmd1 === 'GROUP' && cmd2 === 'STATUS') {
                return await this.handleGroupStatus(from, tokens.slice(2));
            }

            // Single word commands
            switch (cmd1) {
                case 'BALANCE':
                    return await this.handleBalance(from);
                case 'HISTORY':
                    return await this.handleHistory(from);
                case 'PROFILE':
                    return await this.handleProfile(from);
                case 'SEND':
                    return await this.handleSend(from, tokens.slice(1));
                case 'REQUEST':
                    return await this.handleRequest(from, tokens.slice(1));
                case 'CONTRIBUTE':
                    return await this.handleContribute(from, tokens.slice(1));
                case 'WITHDRAW':
                    return await this.handleWithdraw(from, tokens.slice(1));
                case 'HELP':
                case 'SUPPORT':
                    return await this.handleHelp(from);
                default:
                    return await this.handleUnknown(from, text);
            }
        } catch (error: any) {
            console.error('Error processing command:', error);
            await whatsappService.sendMessage(from, `An error occurred: ${error.message}`);
        }
    }

    // --- COMMAND HANDLERS ---

    private async handleBalance(from: string) {
        const user = await userService.getOrCreateUser(from);
        if (!user.stellarWallet) {
            return await whatsappService.sendMessage(from, `[BALANCE] Error: Wallet not configured.`);
        }
        const publicKey = user.stellarWallet.split(':')[0];
        const balance = await stellarService.checkBalance(publicKey);
        await whatsappService.sendMessage(from, `[BALANCE] Your balance is ${balance} XLM.`);
    }

    private async handleHistory(from: string) {
        await whatsappService.sendMessage(from, `[HISTORY] Fetching transaction history for ${from}...`);
    }

    private async handleProfile(from: string) {
        const user = await userService.getOrCreateUser(from);
        const publicKey = user.stellarWallet ? user.stellarWallet.split(':')[0] : 'None';
        const profileInfo = `*Kolo Profile*\n` +
            `Phone: ${user.phoneNumber}\n` +
            `Username: ${user.username || 'Not set'}\n` +
            `Wallet: ${publicKey}\n` +
            `Joined: ${user.createdAt.toDateString()}`;
        await whatsappService.sendMessage(from, profileInfo);
    }

    private async handleSend(from: string, args: string[]) {
        if (args.length < 2) {
            return await whatsappService.sendMessage(from, 'Usage: SEND <amount> <@username or phone>');
        }
        const amount = args[0];
        const target = args[1];

        const sender = await userService.getOrCreateUser(from);
        if (!sender.stellarWallet) {
            return await whatsappService.sendMessage(from, 'Error: Your wallet is not configured.');
        }

        const recipient = await userService.resolveUser(target);
        if (!recipient || !recipient.stellarWallet) {
            return await whatsappService.sendMessage(from, `Error: Could not find wallet for user ${target}.`);
        }

        const senderSecret = sender.stellarWallet.split(':')[1];
        const recipientPublicKey = recipient.stellarWallet.split(':')[0];

        try {
            await whatsappService.sendMessage(from, `[SEND] Initiating transfer of ${amount} XLM to ${target}...`);
            await stellarService.sendPayment(senderSecret, recipientPublicKey, amount);
            await whatsappService.sendMessage(from, `✅ Successfully sent ${amount} XLM to ${target}!`);
        } catch (e: any) {
            console.error(e);
            await whatsappService.sendMessage(from, `❌ [SEND] Failed: ${e.message || 'Transaction error'}`);
        }
    }

    private async handleRequest(from: string, args: string[]) {
        if (args.length < 2) {
            return await whatsappService.sendMessage(from, 'Usage: REQUEST <amount> <@username or phone>');
        }
        const amount = args[0];
        const target = args[1];

        const sender = await userService.getOrCreateUser(from);
        const recipient = await userService.resolveUser(target);

        if (!recipient) {
            return await whatsappService.sendMessage(from, `Error: Could not find user ${target}.`);
        }

        const senderHandle = sender.username ? '@' + sender.username : sender.phoneNumber;
        await whatsappService.sendMessage(recipient.phoneNumber, `🔔 [REQUEST] ${senderHandle} is requesting ${amount} XLM from you. Reply with: SEND ${amount} ${sender.phoneNumber}`);
        await whatsappService.sendMessage(from, `[REQUEST] Request for ${amount} XLM sent to ${target}.`);
    }

    private async handleCreateGroup(from: string, args: string[]) {
        if (args.length < 3) {
            return await whatsappService.sendMessage(from, 'Usage: CREATE GROUP <name> <amount> <frequency>');
        }
        const frequency = args.pop();
        const amount = args.pop();
        const name = args.join(' ');
        await whatsappService.sendMessage(from, `[CREATE GROUP] Creating group "${name}" with ${amount} USDC ${frequency}...`);
    }

    private async handleJoinGroup(from: string, args: string[]) {
        if (args.length < 1) {
            return await whatsappService.sendMessage(from, 'Usage: JOIN GROUP <groupId>');
        }
        const groupId = args[0];
        await whatsappService.sendMessage(from, `[JOIN GROUP] Joining group ${groupId}...`);
    }

    private async handleInviteMember(from: string, args: string[]) {
        if (args.length < 1) {
            return await whatsappService.sendMessage(from, 'Usage: INVITE MEMBER <@username or phone>');
        }
        const target = args[0];
        await whatsappService.sendMessage(from, `[INVITE MEMBER] Inviting ${target} to your group...`);
    }

    private async handleGroupStatus(from: string, args: string[]) {
        await whatsappService.sendMessage(from, `[GROUP STATUS] Fetching group status...`);
    }

    private async handleContribute(from: string, args: string[]) {
        if (args.length < 1) {
            return await whatsappService.sendMessage(from, 'Usage: CONTRIBUTE <amount>');
        }
        const amount = args[0];
        await whatsappService.sendMessage(from, `[CONTRIBUTE] Contributing ${amount} USDC to your group...`);
    }

    private async handleWithdraw(from: string, args: string[]) {
        if (args.length < 1) {
            return await whatsappService.sendMessage(from, 'Usage: WITHDRAW <amount>');
        }
        const amount = args[0];
        await whatsappService.sendMessage(from, `[WITHDRAW] Withdrawing ${amount} USDC...`);
    }

    private async handleHelp(from: string) {
        const helpText = `*Kolo Commands:*\n\n` +
            `_Account_\n` +
            `BALANCE\n` +
            `HISTORY\n` +
            `PROFILE\n\n` +
            `_Payments_\n` +
            `SEND <amount> <@user>\n` +
            `REQUEST <amount> <@user>\n\n` +
            `_Savings Groups_\n` +
            `CREATE GROUP <name> <amount> <frequency>\n` +
            `JOIN GROUP <groupId>\n` +
            `INVITE MEMBER <@user>\n` +
            `GROUP STATUS\n` +
            `CONTRIBUTE <amount>\n` +
            `WITHDRAW <amount>\n\n` +
            `_Support_\n` +
            `HELP\n` +
            `SUPPORT`;
        await whatsappService.sendMessage(from, helpText);
    }

    private async handleUnknown(from: string, text: string) {
        await whatsappService.sendMessage(from, `I didn't understand that command. Send HELP to see available commands.`);
    }
}
