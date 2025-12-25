import DiagnosisHistory from '../models/diagnosisHistory.model.js';
import mongoose from 'mongoose';
import { validationResult } from 'express-validator';

// Create a new diagnosis record
const createDiagnosis = async (req, res) => {
  try {
    console.log("Received request body:", JSON.stringify(req.body, null, 2));
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { imageUrl, cropName, diagnosisResult } = req.body;
    const userId = req.user.id; // Assuming user ID comes from auth middleware

    const diagnosis = new DiagnosisHistory({
      userId,
      imageUrl,
      cropName,
      diagnosisResult: {
        diseaseName: diagnosisResult.diseaseName,
        confidence: diagnosisResult.confidence,
        treatment: diagnosisResult.treatment || '',
        cureSuggestion: diagnosisResult.cureSuggestion || '' // Add this line
      }
    });

    await diagnosis.save();

    res.status(201).json({
      success: true,
      message: 'Diagnosis saved successfully',
      data: diagnosis
    });
  } catch (error) {
    console.error('Error creating diagnosis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save diagnosis',
      error: error.message
    });
  }
};

// Get user's diagnosis history with pagination
const getUserDiagnosisHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 10, cropName, startDate, endDate } = req.query;

    // Build filter object
    const filter = { userId, isActive: true };
    
    if (cropName) {
      filter.cropName = { $regex: cropName, $options: 'i' };
    }

    if (startDate || endDate) {
      filter.diagnosisDate = {};
      if (startDate) {
        filter.diagnosisDate.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.diagnosisDate.$lte = new Date(endDate);
      }
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [diagnoses, total] = await Promise.all([
      DiagnosisHistory.find(filter)
        .sort({ diagnosisDate: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      DiagnosisHistory.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(total / parseInt(limit));

    res.status(200).json({
      success: true,
      data: {
        diagnoses,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: total,
          itemsPerPage: parseInt(limit),
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });
  } catch (error) {
    console.error('Error fetching diagnosis history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch diagnosis history',
      error: error.message
    });
  }
};

// Get recent diagnoses for home page
const getRecentDiagnoses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 5 } = req.query;

    const recentDiagnoses = await DiagnosisHistory.find({
      userId,
      isActive: true
    })
      .sort({ diagnosisDate: -1 })
      .limit(parseInt(limit))
      .select('imageUrl cropName diagnosisResult.diseaseName diagnosisDate')
      .lean();

    res.status(200).json({
      success: true,
      data: recentDiagnoses
    });
  } catch (error) {
    console.error('Error fetching recent diagnoses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent diagnoses',
      error: error.message
    });
  }
};

// Get diagnosis by ID
const getDiagnosisById = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const diagnosis = await DiagnosisHistory.findOne({
      _id: id,
      userId,
      isActive: true
    }).lean();

    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnosis not found'
      });
    }

    res.status(200).json({
      success: true,
      data: diagnosis
    });
  } catch (error) {
    console.error('Error fetching diagnosis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch diagnosis',
      error: error.message
    });
  }
};

// Delete diagnosis (soft delete)
const deleteDiagnosis = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const diagnosis = await DiagnosisHistory.findOneAndUpdate(
      { _id: id, userId },
      { isActive: false },
      { new: true }
    );

    if (!diagnosis) {
      return res.status(404).json({
        success: false,
        message: 'Diagnosis not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Diagnosis deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting diagnosis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete diagnosis',
      error: error.message
    });
  }
};

// Get diagnosis statistics for user
const getDiagnosisStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const stats = await DiagnosisHistory.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), isActive: true } },
      {
        $group: {
          _id: null,
          totalDiagnoses: { $sum: 1 },
          uniqueCrops: { $addToSet: '$cropName' },
          uniqueDiseases: { $addToSet: '$diagnosisResult.diseaseName' },
          avgConfidence: { $avg: '$diagnosisResult.confidence' }
        }
      },
      {
        $project: {
          _id: 0,
          totalDiagnoses: 1,
          uniqueCropsCount: { $size: '$uniqueCrops' },
          uniqueDiseasesCount: { $size: '$uniqueDiseases' },
          avgConfidence: { $round: ['$avgConfidence', 2] }
        }
      }
    ]);

    const result = stats[0] || {
      totalDiagnoses: 0,
      uniqueCropsCount: 0,
      uniqueDiseasesCount: 0,
      avgConfidence: 0
    };

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching diagnosis stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch diagnosis statistics',
      error: error.message
    });
  }
};

export {
  createDiagnosis,
  getUserDiagnosisHistory,
  getRecentDiagnoses,
  getDiagnosisById,
  deleteDiagnosis,
  getDiagnosisStats
};