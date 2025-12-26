import express from 'express';
import { generateSpeech } from '../controllers/tts.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

/**
 * @route   POST /api/tts/speak
 * @desc    Generate speech audio from text using Azure TTS
 * @access  Private (requires JWT authentication)
 * @body    { text: string, language: 'en' | 'ur' }
 * @returns { success: boolean, audio: string (base64), format: 'mp3', language: string }
 */
router.post('/speak', authenticateToken, generateSpeech);

export default router;
