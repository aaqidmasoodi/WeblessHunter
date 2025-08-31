# WeblessHunter

A powerful web application to hunt down businesses without websites using advanced radar search technology and Google Maps Places API.

## Setup

1. **Get Google Maps API Key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable "Places API" and "Maps JavaScript API"
   - Create credentials (API Key)
   - Restrict the API key to your domain for security

2. **Configure the app:**
   - Replace `YOUR_GOOGLE_MAPS_API_KEY` in `index.html` with your actual API key (appears twice)

3. **Run the app:**
   - Open `index.html` in a web browser
   - Or serve it using a local server:
     ```bash
     python3 -m http.server 8000
     # Then visit http://localhost:8000
     ```

## Usage

1. Enter a location or click "Use Current Location"
2. Select search intensity (Walking Distance to Regional)
3. Click "Search" to activate radar scanning
4. Watch real-time radar animation as businesses are discovered
5. View results in table or interactive map with filtering options

## Features

- **Radar Search Animation** - Visual scanning with expanding green circles
- **Real-time Business Discovery** - Red pins drop as businesses are found
- **Potential Client Identification** - Green pins highlight businesses without websites
- **Dual View System** - Switch between table and interactive map views
- **Advanced Filtering** - Show all businesses, potential clients only, or businesses with websites
- **Persistent State** - Complete search results saved and restored after page refresh
- **Contact Integration** - Direct phone calling and business details
- **Export Capabilities** - CSV and JSON export for selected businesses
- **Distance-based Search** - From hyperlocal (1km) to regional (50km) coverage

## API Limits

- Google Places API has usage limits and costs
- Free tier includes $200 monthly credit
- Monitor usage in Google Cloud Console
