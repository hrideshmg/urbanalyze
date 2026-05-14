Winning project for the SDG Track at the evoLUMIN national level hackathon. It was made by me, [@amansxcalibur](https://github.com/amansxcalibur), [@itsabhinavm](https://github.com/ItsAbhinavM) and [@angrezichatterbox](https://github.com/angrezichatterbox) under our team name - Sadya Scripters.

Devfolio Link: [Nivasa](https://devfolio.co/projects/ecoaware-d0cd)

## Introduction

# NIVASA

**NIVASA** is a web application designed to help users determine the suitability of specific areas for housing or development by analyzing various critical factors, including weather, earthquake activity, air quality index, proximity to amenities etc.

## Features

- **Location Suitability Analysis**: Evaluate whether a specific area is suitable for housing/development based on multiple data points.
- **Dynamic Weights**: Type out your preferences in plaintext and we will compare different locations based on your input.
- **Data Insights**: Collect and analyze key data points, including:
  - **Weather**: Current and historical weather patterns and predictions.
  - **Seismic Activity**: Records of earthquakes in the area.
  - **Flood Risk**: Analysis of river discharge rates.
  - **Distance to Amenities**: Names and distances to the closest hospitals, police stations etc
- **User-Friendly Map Interface**: Easily input a location and view the analysis results through a visual, map-based interface.

## Tech Stack

- **Next.js**: Enables server-side rendering and efficient routing for a fast, responsive user experience.
- **Tailwind CSS**: Provides a responsive and modern design with custom styling options.
- **OpenStreetMap API**: Supplies map data to visualize the location and display analytical data overlays.
- **Gemini**: Used for summarising the raw data in a user friendly manner.

## Getting Started

Follow these steps to set up NIVASA on your local machine:

1. **Clone the Repository**

   ```bash
   git clone https://github.com/hrideshmg/urbanalyze.git
   cd urbanalyze
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Set up environment variables:

   Create a `.env.local` file in the root directory with the necessary API keys:

   ```plaintext
   NEXT_PUBLIC_MAP_API_KEY=<Your_OpenStreetMap_API_Key>
   NEXT_PUBLIC_GEMINI_API_KEY=<Your_Gemini_API_Key>
   NEXT_PUBLIC_AQI_KEY=<Your_public_Aqi_key>
   NEXT_PUBLIC_PEXELS_KEY=<Your_public_pexels_api_key>
   ```

4. Start the development server:

   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:3000`.

## Usage

1. **Enter a Location**: Search or select a location on the map.
2. **Enter description**: Enter a brief of your desired plot, like for eg: "Low flood risk and close proximity to hospitals"
3. **View Data Analysis**: The app gathers weather, earthquake, and all other relevant factors.
4. **Receive Suitability Score**: A score is generated taking into account the various factors as well the users input.
5. **Compare Areas**: Compare nearby locations and evaluate different housing options.

## License

This project is licensed under the [MIT License.](LICENSE)
