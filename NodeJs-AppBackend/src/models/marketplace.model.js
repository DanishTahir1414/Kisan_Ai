import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price must be greater than 0"],
    },
    image: {
      type: String,
      default: null,
    },
    contactNumber: {
      type: String,
      required: [true, "Contact number is required"],
      validate: {
        validator: function(v) {
          // Pakistani phone number validation
          return /^((\+92)|0)(3[0-4][0-9])[0-9]{7}$/.test(v);
        },
        message: "Please enter a valid Pakistani phone number"
      }
    },
    location: {
      province: {
        type: String,
        required: [true, "Province is required"],
        trim: true,
      },
      city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
      },
      area: {
        type: String,
        required: [true, "Area is required"],
        trim: true,
      },
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    status: {
      type: String,
      enum: ["active", "sold", "inactive"],
      default: "active",
    },
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Index for better query performance
listingSchema.index({ createdBy: 1 });
listingSchema.index({ "location.province": 1, "location.city": 1 });
listingSchema.index({ status: 1 });
listingSchema.index({ createdAt: -1 });

// Virtual to populate creator info
listingSchema.virtual('creator', {
  ref: 'User',
  localField: 'createdBy',
  foreignField: '_id',
  justOne: true
});

const Listing = mongoose.model("Listing", listingSchema);

export default Listing;