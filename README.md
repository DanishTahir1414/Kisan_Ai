# 🌾 Smart Agriculture Platform

[![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)
[![Express](https://img.shields.io/badge/Express-4.18+-000000.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0+-47A248.svg)](https://www.mongodb.com/)
[![License](https://img.shields.io/badge/License-Academic-yellow.svg)](LICENSE)

A comprehensive full-stack agricultural solution combining AI-powered plant disease detection, crop yield prediction, and a complete farm management system with marketplace and community features.

> **Final Year Project** - Smart Agriculture Platform with AI/ML Integration

## 📋 Table of Contents

- [Features](#-features)
- [Demo](#-demo)
- [Architecture](#-architecture)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [API Documentation](#-api-documentation)
- [Usage Examples](#-usage-examples)
- [Machine Learning Models](#-machine-learning-models)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [License](#-license)
- [Contact](#-contact)

## ✨ Features

### 🤖 AI-Powered Disease Detection
- Multi-crop disease detection (Tomato, Cotton, Mango, Rice)
- MobileNetV2-based deep learning models
- Real-time image analysis with 85%+ accuracy
- Top-3 predictions with confidence scores
- Support for 15+ plant diseases

### 💊 Intelligent Cure Suggestions
- LLM-powered treatment recommendations (Groq LLaMA 3.3)
- Multi-language support (English & Urdu)
- Disease-specific cure guidelines
- Preventive measures and best practices
- Fallback system for offline availability

### 📈 Crop Yield Prediction
- ML-based yield forecasting
- Historical data analysis
- Environmental factor consideration
- Multiple crop type support

### 🌐 Farm Management System
- User authentication & authorization (JWT)
- Marketplace for agricultural products
- Community forum for farmers
- Diagnosis history tracking
- Smart irrigation scheduling

## 🎬 Demo

<!-- Add screenshots or GIF demos here -->
<!-- ![Disease Detection Demo](docs/images/disease-detection-demo.gif) -->
<!-- ![Dashboard Screenshot](docs/images/dashboard.png) -->

> **Note**: Add screenshots/demos to `docs/images/` directory

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend Layer                       │
│            (React/React Native - Not Included)           │
└───────────────────┬─────────────────────────────────────┘
                    │
        ┌───────────┴───────────┐
        │                       │
┌───────▼──────────┐   ┌────────▼─────────┐
│  Node.js Backend │   │  FastAPI Backend │
│   (Port 3000)    │   │   (Port 8000)    │
│                  │   │                  │
│ • Authentication │   │ • AI/ML Models   │
│ • Marketplace    │   │ • Disease Det.   │
│ • Community      │   │ • Yield Pred.    │
│ • Irrigation     │   │ • LLM API        │
└────────┬─────────┘   └────────┬─────────┘
         │                      │
    ┌────▼────┐           ┌────▼────┐
    │ MongoDB │           │ Models  │
    └─────────┘           │ (.keras)│
                          └─────────┘
```

## 📁 Project Structure

```
FYP/
├── Fastapi-AIBackend/              # AI/ML Microservice
│   ├── main.py                     # FastAPI application (1500+ lines)
│   ├── models/                     # Trained ML models (gitignored)
│   │   ├── tomato_disease_model.keras
│   │   ├── cotton_disease_model.keras
│   │   ├── mango_disease_model.keras
│   │   ├── rice_disease_model.keras
│   │   └── crop_yield_model.pkl
│   ├── class_labels/               # Disease classification labels
│   │   ├── tomato_class_labels.txt
│   │   ├── cotton_class_labels.txt
│   │   ├── mango_class_labels.txt
│   │   └── rice_class_labels.txt
│   ├── requirements.txt            # Python dependencies
│   ├── .env                        # Environment variables (gitignored)
│   ├── .gitignore
│   └── README.md
│
├── NodeJs-AppBackend/              # Main Application Backend
│   ├── src/
│   │   ├── index.js                # Express server entry (50+ lines)
│   │   ├── configs/
│   │   │   └── db.js               # MongoDB connection
│   │   ├── routes/                 # API route handlers
│   │   │   ├── auth.route.js
│   │   │   ├── marketplace.route.js
│   │   │   ├── community.route.js
│   │   │   ├── posting.route.js
│   │   │   ├── diagnosisHistory.route.js
│   │   │   └── irrigation.route.js
│   │   ├── models/                 # Mongoose schemas
│   │   ├── controllers/            # Business logic
│   │   └── middleware/             # Auth & validation
│   ├── package.json
│   ├── .env                        # Environment variables (gitignored)
│   └── .gitignore
│
├── docs/                           # Documentation & screenshots
├── README.md                       # This file
└── LICENSE                         # License file

```
