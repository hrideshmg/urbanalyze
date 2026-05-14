import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useCoords } from "@/app/_context/CoordsContext";
import { geminiGenerateWeights, getCoordinates, logSearchQuery } from "@/app/_scripts/integrations";
import { getPexelsImage } from "@/app/_scripts/integrations";
import {
  geminiSummarise,
  getAQI,
  getEarthquake,
  getHospital,
  getNearbySettlements,
  getRiverDischarge,
  getWeather,
  nomainatimQuery,
} from "@/app/_scripts/integrations";
import { ACCESS_TOKEN_NAME } from "@/app/_constants/constants";
import Loader from "./loader";

function haversineDistance(lat1, lon1, lat2, lon2) {
  // Used to get distance between two lat,lon pairs
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export default function SearchForm({ isLoading, setIsLoading }) {
  const router = useRouter();
  const { setCoords, settlementData, setSettlementData, setProgress, weights, setWeights, coords } =
    useCoords();

  const [state, setState] = useState({
    location: "",
    desc: "",
  });


  useEffect(() => {
    async function fetchResult() {
      if (!coords || !weights) return;
      try {
        let result = await triggerGeoFusion(coords, 10000);
        setSettlementData(result);
      } catch (error) {
        console.error("Error in geo fusion:", error);
        setIsLoading(false);
      }
    }
    if (weights && coords) fetchResult()
  }, [weights, coords])

  const handleBlur = async (e) => {
    if (e.target.value) {
      const t_coords = await getCoordinates(e.target.value);
      setCoords(t_coords);
    }
  };

  const handleChange = (e) => {
    const { id, value } = e.target;
    setState((prevState) => ({
      ...prevState,
      [id]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    const form_data = new FormData(e.target);
    const prompt = form_data.get("prompt");
    const location = form_data.get("location");
    
    // Ensure we have coordinates
    let currentCoords = coords;
    if (!currentCoords && location) {
      currentCoords = await getCoordinates(location);
      setCoords(currentCoords);
    }

    if (!currentCoords) {
      console.error("Could not determine coordinates for location:", location);
      setIsLoading(false);
      return;
    }

    const weights = await geminiGenerateWeights(prompt);
    
    // Log to BigQuery
    if (weights) {
      await logSearchQuery(state.location, prompt, weights);
    }
    
    setWeights(weights);
  };

  useEffect(() => {
    if (
      settlementData &&
      Object.keys(settlementData).length > 0 &&
      isLoading == true
    ) {
      localStorage.setItem(ACCESS_TOKEN_NAME, JSON.stringify(settlementData));
      // console.log(settlementData)
      redirectToMap();
    }
  }, [settlementData, router]);

  const redirectToMap = () => {
    router.push("/map");
  };

  async function triggerGeoFusion(coords, radius) {
    const [lat, lon] = coords;
    let result = [];
    const { h_w, t_w, r_w, e_w, aqi_w, ho_w } = weights;
    console.log(weights)

    // Update progress for fetching nearby settlements
    setProgress((prevProgress) => ({
      ...prevProgress,
      messages: [...prevProgress.messages, "Fetching Nearby Settlements"],
    }));

    const nearby_settlements = await getNearbySettlements(lat, lon, radius);
    
    if (!nearby_settlements || !Array.isArray(nearby_settlements.elements) || nearby_settlements.elements.length === 0) {
      console.warn("No nearby settlements found or failed to fetch.");
      setProgress({ messages: [], target_len: 0 });
      setIsLoading(false);
      return [];
    }

    setProgress((prevProgress) => ({
      ...prevProgress,
      target_len: nearby_settlements["elements"].length * 8 + 2,
    }));

    const settlementsData = await Promise.all(
      nearby_settlements["elements"].map(async (settlement, index) => {
        const s_lat = settlement["lat"];
        const s_lon = settlement["lon"];
        const settlement_data = {
          address: {},
          amenities: {},
          weather: {},
          calamity: {},
          images: {},
        };

        const aqiResponse = await getAQI(s_lat, s_lon);
        const aqi = (aqiResponse && aqiResponse.data) ? aqiResponse.data.aqi || 100 : 100;
        setProgress((prevProgress) => ({
          ...prevProgress,
          messages: [
            ...prevProgress.messages,
            `Fetched Air Quality Index For Settlement ${index}`,
          ],
        }));

        const weather = (await getWeather(s_lat, s_lon)) || {
          current: { temperature_2m: 0, relative_humidity_2m: 0 },
        };
        setProgress((prevProgress) => ({
          ...prevProgress,
          messages: [
            ...prevProgress.messages,
            `Fetched Weather For Settlement ${index}`,
          ],
        }));

        const avg_humidity = weather.current.relative_humidity_2m;
        const avg_temperature = weather.current.temperature_2m;

        const nominatimData = await nomainatimQuery(s_lat, s_lon);
        const nominatim = (nominatimData && nominatimData.features && nominatimData.features[0])
          ? nominatimData.features[0].properties 
          : { formatted: "API Fetch Failed" };
        setProgress((prevProgress) => ({
          ...prevProgress,
          messages: [
            ...prevProgress.messages,
            `Fetched Location Details For Settlement ${index}`,
          ],
        }));

        const display_name = nominatim.formatted;
        const river_discharge = (
          (await getRiverDischarge(s_lat, s_lon)) || {
            daily: { river_discharge: [0] },
          }
        ).daily.river_discharge;
        setProgress((prevProgress) => ({
          ...prevProgress,
          messages: [
            ...prevProgress.messages,
            `Fetched River Discharge For Settlement ${index}`,
          ],
        }));

        const river_discharge_avg =
          river_discharge.reduce((a, b) => a + b, 0) /
          (river_discharge.length || 1);

        const earthquakeData = await getEarthquake(s_lat, s_lon);
        const earthquakes = (earthquakeData && earthquakeData.features) ? earthquakeData.features.length : 0;
        setProgress((prevProgress) => ({
          ...prevProgress,
          messages: [
            ...prevProgress.messages,
            `Fetched Seismic Activity For Settlement ${index}`,
          ],
        }));

        const hospitalData = await getHospital(s_lat, s_lon);
        const closest_hospital = (hospitalData && hospitalData.elements && hospitalData.elements.length > 0)
          ? hospitalData.elements[0]
          : { lat: s_lat, lon: s_lon, tags: { name: "Unknown" } };
        setProgress((prevProgress) => ({
          ...prevProgress,
          messages: [
            ...prevProgress.messages,
            `Fetched Amenities For Settlement ${index}`,
          ],
        }));

        const closest_hospital_dist = haversineDistance(
          s_lat,
          s_lon,
          closest_hospital.lat,
          closest_hospital.lon
        );
        const closest_hospital_name = closest_hospital.tags.name || "Unknown";

        // Score calculation
        const h_n = avg_humidity / 100;
        const t_n = (avg_temperature + 30) / 80;
        const r_n = 1 - river_discharge_avg / 50;
        const e_n = 1 - earthquakes / 200;
        const ho_n = closest_hospital_dist / 10000;
        const aqi_n = 1 - aqi / 500;
        const score = Math.round(
          (h_n * h_w +
            t_n * t_w +
            r_n * r_w +
            e_n * e_w +
            ho_n * ho_w +
            aqi_n * aqi_w) *
          100
        );

        settlement_data.index = score;
        settlement_data.address.display_name = display_name;
        settlement_data.address.city =
          nominatim.city || nominatim.town || nominatim.village || "Unknown";
        settlement_data.address.state = nominatim.state || "Unknown";
        settlement_data.address.country = nominatim.country || "Unknown";
        settlement_data.address.location = [s_lat, s_lon];
        settlement_data.amenities.closest_hosp_name = closest_hospital_name;
        settlement_data.amenities.closest_hosp_dist = closest_hospital_dist;
        settlement_data.weather.temperature = avg_temperature;
        settlement_data.weather.humidity = avg_humidity;
        settlement_data.calamity.river_discharge = river_discharge_avg;
        settlement_data.calamity.earthquakes = earthquakes;
        settlement_data.calamity.aqi = aqi;

        const imageQuery = settlement_data.address.city;
        const settlement_img = await getPexelsImage(imageQuery);

        const photo = settlement_img?.photos?.[0]?.src;
        settlement_data.images.landscape = photo?.landscape || "/placeholder.jpg";
        settlement_data.images.small = photo?.small || "/placeholder.jpg";
        settlement_data.images.tiny = photo?.tiny || "/placeholder.jpg";
        setProgress((prevProgress) => ({
          ...prevProgress,
          messages: [
            ...prevProgress.messages,
            `Fetched Images For Settlement ${index}`,
          ],
        }));

        // Add a slight delay based on the index to stagger the API calls and prevent rate limits
        if (index > 0) {
          await delay(index * 2000); 
        }

        settlement_data.gemini_summary =
          (await geminiSummarise(settlement_data)) || "Placeholder Summary";
        // Update progress for generating summary
        setProgress((prevProgress) => ({
          ...prevProgress,
          messages: [
            ...prevProgress.messages,
            `Generated Summary For Settlement ${index}`,
          ],
        }));

        return settlement_data;
      })
    );

    result.push(...settlementsData);
    result = result.sort((a, b) => {
      return b.index - a.index;
    });
    setProgress((prevProgress) => ({
      ...prevProgress,
      messages: [...prevProgress.messages, `Data Fetching Complete!`],
    }));
    await delay(1000);
    setProgress({ messages: [], target_len: 0 });
    return result;
  }

  return (
    <>
      {isLoading && isLoading != "not yet" ? (
        <Loader />
      ) : (
        <form
          onSubmit={handleSubmit}
          className="min-h-[80vh] min-w-[40vw] bg-light flex justify-center items-center flex-col rounded-[2vw] shadow-[0_10px_20px_rgba(0,0,0,_0.2)]"
        >
          <p className="text-[4.5vw] tracking-tighter w-[30vw] text-start font-semibold">
            ENTER
          </p>
          <br />
          <p className="font-semibold text-[4.5vw] tracking-tighter -mt-[2.7vw] w-[30vw] text-start">
            DETAILS
          </p>
          <div className="flex flex-col w-[30vw]">
            <div className="flex">
              <p className="text-[2vw] mr-[0.1vw]">Location:</p>
              <input
                id="location"
                placeholder="Kollam"
                value={state.location}
                onChange={handleChange}
                onBlur={handleBlur}
                required
                type="text"
                className="bg-transparent w-full pl-[0.2vw] pr-[0.5vw] text-[1.6vw] border border-transparent focus:border-gray-300 focus:outline-none focus:border-2"
              />
            </div>
            <div className="h-[2px] bg-black w-full mb-[0.5vw]"></div>
            <div className="flex-row">
              <p className="text-[2vw] mr-[1vw]">What are you looking for :</p>
              <textarea
                id="desc"
                name="prompt"
                placeholder="Hospitals, good AQI etc"
                value={state.desc}
                onChange={handleChange}
                className="bg-transparent w-full px-[0.5vw] rounded-xl focus:border-b-0 text-[1.6vw] h-[15vh] word-wrap break-all max-w-[100%] border border-transparent focus:border-gray-300 focus:outline-none focus:border-2 leading-tight"
              />
            </div>

            <div className="h-[2px] bg-black w-full mb-[0.5vw]"></div>
          </div>
          <div className="flex flex-col w-[30vw]"></div>
          <div className="flex w-[30vw]">
            <div className="flex flex-col flex-1">
              <div className="flex"></div>
              <button
                type="submit"
                className="flex-1 bg-black rounded-[2vw] flex justify-center items-center mt-[1vw] w-full min-h-[4vw]"
              >
                <p className="text-white">SEARCH</p>
              </button>
            </div>
          </div>
        </form>
      )}
    </>
  );
}
