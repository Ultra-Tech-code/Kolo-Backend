import { BotController } from '../controllers/bot.controller';
import { Request, Response } from 'express';
jest.mock('../services/whatsapp.service', () => ({
    WhatsAppService: jest.fn().mockImplementation(() => ({
        sendMessage: jest.fn().mockResolvedValue(true)
    }))
}));
