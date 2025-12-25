import mongoose from "mongoose";

const diagnosisHistorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    cropName: {
      type: String,
      required: true,
      trim: true,
    },
    diagnosisResult: {
      diseaseName: {
        type: String,
        required: true,
      },
      confidence: {
        type: Number,
        min: 0,
        max: 100,
      },
      description: {
        type: String,
      },
      treatment: {
        type: String,
      },
      cureSuggestion: {
        type: String,
      },
    },
    diagnosisDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying by user and date
diagnosisHistorySchema.index({ userId: 1, diagnosisDate: -1 });

// Virtual for formatted date
diagnosisHistorySchema.virtual("formattedDate").get(function () {
  return this.diagnosisDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
});

// Ensure virtual fields are serialized
diagnosisHistorySchema.set("toJSON", {
  virtuals: true,
});

const DiagnosisHistory = mongoose.model(
  "DiagnosisHistory",
  diagnosisHistorySchema
);

export default DiagnosisHistory;