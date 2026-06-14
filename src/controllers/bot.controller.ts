import { Request, Response } from 'express';
import { WhatsAppService } from '../services/whatsapp.service';
import { StellarService } from '../services/stellar.service';
import { config } from '../config/env';

const whatsappService = new WhatsAppService();
const stellarService = new StellarService();

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
                    await this.processCommand(from, msgBody);
                }
            }
            res.sendStatus(200);
        } else {
            res.sendStatus(404);
        }
    }

    private async processCommand(from: string, text: string) {
        const command = text.trim().toUpperCase();

        if (command === 'BALANCE') {
            await whatsappService.sendMessage(from, 'Checking your balance... (Mocked response)');
        } else if (command === 'PROFILE') {
            await whatsappService.sendMessage(from, 'Fetching your profile...');
        } else {
            await whatsappService.sendMessage(from, `Welcome to Kolo! You sent: ${text}\nAvailable commands: BALANCE, PROFILE`);
        }
    }
}
