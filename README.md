<h1 align="center">
  <img src="assets/Screenshot 2026-04-30 184024.png" width="60" style="vertical-align:middle" />
  LabInsight Pro
</h1>

<p align="center">
  <b>AI-powered assistant for understanding and tracking your lab data</b><br/>
  Upload blood reports, chat with an AI, and visualize biomarker trends — all in one place.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" />
  <img src="https://img.shields.io/badge/Node.js-Express-339933?logo=node.js&logoColor=white" />
  <img src="https://img.shields.io/badge/Redis-Data%20Store-DC382D?logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/Google%20Gemini-AI-4285F4?logo=google&logoColor=white" />
  <img src="https://img.shields.io/badge/JWT-Auth-000000?logo=jsonwebtokens&logoColor=white" />
</p>

---

## Demo

> **Watch the full walkthrough:**

<video src="assets/Lan Insight Pro Video Walk-through.mp4" controls width="100%"></video>

> _If the video doesn't render above, [click here to download and watch it](assets/Lan%20Insight%20Pro%20Video%20Walk-through.mp4)._

---

## Screenshots

| AI Chatbot | Lab Reports |
|:-----------:|:-----------:|
| ![Chatbot](assets/Screenshot%202026-04-30%20184024.png) | ![Lab Reports](assets/Screenshot%202026-04-29%20233455.png) |

---

## Features

- **PDF Blood Report Upload** — Upload your blood test PDFs; the app parses them automatically and extracts all biomarkers.
- **AI Health Chatbot** — Powered by Google Gemini, ask questions about your reports, biomarkers, trends, and health in natural language.
- **Biomarker Dashboard** — View all biomarkers from your latest report with reference range indicators.
- **Historical Trend Charts** — Track how any biomarker changes over time with interactive charts.
- **Lab Reports Library** — Browse all uploaded reports, view original PDFs, and compare results across dates.
- **Secure Authentication** — JWT-based login and registration with bcrypt-hashed passwords.
- **Persistent Chat History** — Conversations are saved per user and can be resumed at any time.
- **Responsive UI** — Clean dark-themed interface built with React and Material UI.

---

## Tech Stack

### Frontend
| Technology | Role |
|---|---|
| React 18 | UI framework |
| React Router DOM v6 | Client-side routing |
| Material UI (MUI) | Component library |
| Chart.js / Recharts / MUI X Charts | Biomarker trend visualizations |
| Axios | HTTP client |
| react-pdf / pdfjs-dist | In-browser PDF viewer |
| FontAwesome | Icons |

### Backend
| Technology | Role |
|---|---|
| Node.js + Express | REST API server |
| Redis (ioredis) | Primary data store |
| Google Generative AI (Gemini) | AI chat responses |
| JWT (jsonwebtoken) | Authentication tokens |
| bcrypt | Password hashing |
| Multer | PDF file upload handling |
| pdf-parse / pdf2table | PDF text & table extraction |
| AWS SDK | Cloud file storage |
| Joi | Request validation |

---

## Project Structure

```
LabInsight Pro/
├── client/                   # React frontend
│   └── src/
│       ├── App.js            # Route definitions
│       └── components/
│           ├── Login/        # Login page
│           ├── Signup/       # Registration page
│           ├── Main/         # Chatbot & home
│           └── Reports/      # Lab reports, biomarkers, results
├── server/                   # Express backend
│   ├── index.js              # Server entry point
│   ├── db.js                 # Redis connection
│   ├── routes/               # API route handlers
│   ├── controllers/          # Business logic
│   ├── models/               # Redis data models
│   └── data/                 # Static biomarker data
└── assets/                   # Screenshots & demo video
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- Redis server running locally (or a Redis URL)
- Google Gemini API key
- AWS credentials (for file storage)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/labinsight-pro.git
cd labinsight-pro
```

### 2. Configure environment variables

Create a `.env` file inside the `server/` directory:

```env
PORT=8080
JWTPRIVATEKEY=your_jwt_secret_key
SALT=10
REDIS_URL=redis://127.0.0.1:6379
GEMINI_API_KEY=your_google_gemini_api_key
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=your_aws_region
AWS_S3_BUCKET=your_s3_bucket_name
```

### 3. Install dependencies & start the backend

```bash
cd server
npm install
npm start
```

The server will start on `http://localhost:8080`.

### 4. Install dependencies & start the frontend

```bash
cd client
npm install
npm start
```

The React app will open at `http://localhost:3000`.

---

## API Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/login` | User login |
| `POST` | `/api/users/register` | User registration |
| `POST` | `/api/files/upload` | Upload a blood report PDF |
| `GET` | `/api/files/:userId` | Get all uploaded files for a user |
| `GET` | `/api/bloodreport/biomarkers` | Get latest biomarkers for the user |
| `GET` | `/api/bloodreport/latest/:token` | Get the most recent blood report |
| `GET` | `/api/bloodreport/history/:token/:biomarker` | Get biomarker trend history |
| `GET` | `/api/conversations/:userId` | Get all chat conversations |
| `POST` | `/api/conversations` | Save a new chat message |

---

## Usage

1. **Sign up** for a new account or log in.
2. **Upload** a blood test PDF via the chat interface or the Reports section.
3. **View** extracted biomarkers in the Results dashboard — out-of-range values are highlighted.
4. **Chat** with the AI assistant to ask questions like:
   - _"Discuss my latest report"_
   - _"What is Hemoglobin?"_
   - _"Is my glucose level normal?"_
5. **Track trends** by clicking any biomarker to see a historical chart across all your reports.
6. **Browse** all uploaded PDFs in the Lab Reports library.

---

## License

This project is licensed under the terms of the [LICENSE](LICENSE) file.
