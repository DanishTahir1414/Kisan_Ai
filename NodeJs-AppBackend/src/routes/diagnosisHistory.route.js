import express from 'express';
import { body, param, query } from 'express-validator';
import {
  createDiagnosis,
  getUserDiagnosisHistory,
  getRecentDiagnoses,
  getDiagnosisById,
  deleteDiagnosis,
  getDiagnosisStats
} from '../controllers/diagnosisHistory.controller.js';
import { authenticateToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

// Validation rules
const createDiagnosisValidation = [
  body('imageUrl')
    .notEmpty()
    .withMessage('Image URL is required'),
  
  body('cropName')
    .notEmpty()
    .withMessage('Crop name is required')
    .isLength({ min: 2, max: 50 })
    .withMessage('Crop name must be between 2 and 50 characters')
    .trim(),
  
  body('diagnosisResult.diseaseName')
    .notEmpty()
    .withMessage('Disease name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Disease name must be between 2 and 100 characters'),
  
  body('diagnosisResult.confidence')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Confidence must be between 0 and 100'),
  
  body('diagnosisResult.description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  
  body('diagnosisResult.treatment')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Treatment must not exceed 1000 characters')
];

const paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
  
  query('cropName')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Crop name filter must be between 1 and 50 characters'),
  
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
];

const idValidation = [
  param('id')
    .isMongoId()
    .withMessage('Invalid diagnosis ID format')
];

// Routes
router.post(
  '/',
  authenticateToken,
  createDiagnosisValidation,
  createDiagnosis
);

router.get(
  '/',
  authenticateToken,
  paginationValidation,
  getUserDiagnosisHistory
);

router.get(
  '/:id',
  authenticateToken,
  idValidation,
  getDiagnosisById
);

router.delete(
  '/:id',
  authenticateToken,
  idValidation,
  deleteDiagnosis
);

export default router;