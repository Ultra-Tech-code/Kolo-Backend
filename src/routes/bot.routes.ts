import { Router } from 'express';
import { BotController } from '../controllers/bot.controller';

const router = Router();
const botController = new BotController();

router.get('/webhook', botController.verifyWebhook.bind(botController));
router.post('/webhook', botController.handleMessage.bind(botController));

export default router;
