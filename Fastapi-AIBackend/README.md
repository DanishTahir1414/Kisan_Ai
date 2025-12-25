# FastAPI AI Backend

A robust FastAPI-based backend service for AI/ML applications, providing RESTful APIs for model inference and data processing.

## 🚀 Features

- **FastAPI Framework**: High-performance async API framework
- **AI/ML Integration**: Seamless integration with machine learning models
- **RESTful API**: Clean and well-documented API endpoints
- **Environment Configuration**: Secure configuration management with `.env`
- **Model Management**: Organized model storage and versioning

## 📋 Prerequisites

- Python 3.8+
- pip (Python package manager)
- Virtual environment (recommended)

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Fastapi-AIBackend
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv
   
   # On Windows
   venv\Scripts\activate
   
   # On macOS/Linux
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

## 🏃 Running the Application

### Development Mode
```bash
uvicorn main:app --reload
```

### Production Mode
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`

## 📚 API Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

## 📁 Project Structure

```
Fastapi-AIBackend/
├── models/              # AI/ML model files (gitignored)
├── venv/               # Virtual environment (gitignored)
├── __pycache__/        # Python cache files (gitignored)
├── .env                # Environment variables (gitignored)
├── .gitignore          # Git ignore rules
├── main.py             # Application entry point
├── requirements.txt    # Python dependencies
└── README.md          # Project documentation
```

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=True

# Model Configuration
MODEL_PATH=./models
MODEL_VERSION=1.0.0

# Security
SECRET_KEY=your-secret-key-here
API_KEY=your-api-key-here

# Database (if applicable)
DATABASE_URL=your-database-url
```

## 🧪 Testing

```bash
# Run tests
pytest

# Run tests with coverage
pytest --cov=.
```

## 🔒 Security

- API keys and secrets are managed through environment variables
- Model files are excluded from version control
- Follow security best practices for production deployment

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is part of a Final Year Project (FYP).

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- FastAPI documentation and community
- Contributors and supporters of this project

## 📞 Support

For support, email your-email@example.com or open an issue in the repository.

---

**Note**: Make sure to add your actual model files to the `models/` directory and configure your `.env` file before running the application.
