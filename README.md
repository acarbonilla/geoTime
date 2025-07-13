# geoTime

A modern web application for geolocation tracking and time zone management.

## Features

- 🌍 Real-time geolocation tracking
- 🕐 Time zone conversion and display
- 📍 Location history and favorites
- 🎨 Modern, responsive UI with Tailwind CSS
- ⚡ Fast API with React Query for data fetching

## Tech Stack

### Backend
- **Python Flask** - RESTful API
- **Flask-CORS** - Cross-origin resource sharing
- **geopy** - Geocoding and distance calculations
- **pytz** - Time zone handling

### Frontend
- **React** - User interface
- **Tailwind CSS** - Styling
- **React Query** - Data fetching and caching
- **Axios** - HTTP client

## Project Structure

```
geoTime/
├── backend/
│   ├── app.py
│   ├── routes/
│   └── utils/
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
├── requirements.txt
└── README.md
```

## Setup Instructions

### Backend Setup
1. Create a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the Flask server:
   ```bash
   cd backend
   python app.py
   ```

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm start
   ```

## API Endpoints

- `GET /api/location` - Get current location
- `GET /api/timezone/:lat/:lng` - Get timezone for coordinates
- `POST /api/location` - Save location
- `GET /api/history` - Get location history

## License

MIT 