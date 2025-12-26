import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const sdk = require('microsoft-cognitiveservices-speech-sdk');

/**
 * Generate speech audio using Azure Cognitive Services
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
export const generateSpeech = async (req, res) => {
  try {
    const { text, language } = req.body;

    // Validate SDK import
    if (!sdk || !sdk.SpeechConfig || !sdk.SpeechSynthesizer) {
      console.error('Azure Speech SDK not properly loaded');
      return res.status(500).json({
        success: false,
        message: 'Speech service not available',
      });
    }

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Text is required and must be a non-empty string',
      });
    }

    if (!language || !['en', 'ur'].includes(language)) {
      return res.status(400).json({
        success: false,
        message: 'Language must be either "en" or "ur"',
      });
    }

    // Azure Speech Service configuration
    const subscriptionKey = process.env.AZURE_SPEECH_KEY;
    const serviceRegion = process.env.AZURE_SPEECH_REGION;

    if (!subscriptionKey || !serviceRegion) {
      console.error('Azure Speech credentials not configured');
      return res.status(500).json({
        success: false,
        message: 'Speech service not configured',
      });
    }

    // Configure speech synthesis
    const speechConfig = sdk.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);
    
    // Set voice based on language
    if (language === 'ur') {
      speechConfig.speechSynthesisVoiceName = 'ur-PK-AsadNeural'; // Natural Urdu male voice
    } else {
      speechConfig.speechSynthesisVoiceName = 'en-US-JennyNeural'; // Natural English female voice
    }

    // Set output format to MP3
    speechConfig.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

    // Create synthesizer
    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, null);

    // Synthesize speech
    const result = await new Promise((resolve, reject) => {
      synthesizer.speakTextAsync(
        text,
        (result) => {
          synthesizer.close();
          resolve(result);
        },
        (error) => {
          console.error('Speech synthesis error:', error);
          synthesizer.close();
          reject(error);
        }
      );
    });

    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      // Convert audio data to Base64
      const audioData = result.audioData;
      const base64Audio = Buffer.from(audioData).toString('base64');

      return res.status(200).json({
        success: true,
        audio: base64Audio,
        format: 'mp3',
        language: language,
      });
    } else {
      // Handle all other cases (Canceled or other reasons)
      let errorMessage = 'Speech synthesis failed';
      let errorDetails = 'Unknown error';
      
      // Try to get error details if canceled
      if (result.reason === sdk.ResultReason.Canceled) {
        try {
          if (sdk.CancellationDetails) {
            const cancellation = sdk.CancellationDetails.fromResult(result);
            errorDetails = cancellation.errorDetails || result.errorDetails || 'Speech synthesis canceled';
          } else {
            errorDetails = result.errorDetails || 'Speech synthesis canceled';
          }
        } catch (cancelErr) {
          console.error('Error getting cancellation details:', cancelErr.message);
          errorDetails = result.errorDetails || 'Speech synthesis canceled';
        }
      } else {
        errorDetails = `Unexpected result reason: ${result.reason}`;
      }
      
      console.error('Speech synthesis failed:', errorDetails);

      return res.status(500).json({
        success: false,
        message: 'Speech synthesis failed',
        error: errorDetails,
        reason: result.reason,
      });
    }

    // Should never reach here
    return res.status(500).json({
      success: false,
      message: 'Unexpected synthesis result',
    });

  } catch (error) {
    console.error('TTS Controller Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error during speech synthesis',
      error: error.message,
    });
  }
};
