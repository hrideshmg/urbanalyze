"use client"

export default function Stats({currBrief}){
    return(
        <div className="flex-1 flex flex-col">
            <div className="flex justify-center text-[1.2vw] font-semibold mt-[1vw]">{currBrief.address?.location[0]}°N, {currBrief.address?.location[1]}°E</div>
            <div className="mt-[0.5vw]">
                <p className="text-[1.2vw] font-semibold">Amenities</p>
                <div>
                    <p className="text-[1vw]">Hospitals</p>
                    <div className="flex text-[1vw] mx-[1vw]">
                        1. <p className="font-semibold">{currBrief.amenities?.closest_hosp_name}</p>
                        <p>&nbsp;about <strong>{currBrief.amenities?.closest_hosp_dist}km</strong> away</p>
                    </div>
                </div>
            </div>
            <div className="mt-[1vw]">
                <p className="text-[1.2vw] font-semibold">Weather</p>
                <div className="flex text-[1vw]">
                    <div className="flex flex-1 items-end mx-[1vw]">
                        <p className="mb-[0.2vw]">Temperature &nbsp;</p>
                        <p className="text-[1.5vw]">{currBrief.weather?.temperature}<span className="font-extralight text-[1vw]">°C</span></p>
                    </div>
                    <div className="flex flex-1 items-end mx-[1vw]">
                        <p className="mb-[0.2vw]">Humidity &nbsp;</p>
                        <p className="text-[1.5vw]">{currBrief.weather?.humidity}<span className="text-[1vw] font-extralight">%</span></p>
                    </div>
                </div>
            </div>
            <div className="mt-[1vw]">
                <p className="text-[1.2vw] font-semibold">Risk Profile<span className="font-extralight text-[1vw]"> (past 20yrs)</span></p>
                <div className="flex flex-wrap text-[1vw]">
                    <div className="flex-[3] mx-[1vw]">
                        <p>River Discharge</p>
                        <p className="text-[1.5vw]">{(currBrief.calamity?.river_discharge)?.toFixed(7)}<span className="text-[1vw] font-extralight">m3/s</span></p>
                    </div>
                    <div className="flex-[2] mx-[1vw]">
                        <p>Earthquakes</p>
                        <p className="text-[1.5vw]">{currBrief.calamity?.earthquakes}</p>
                    </div>
                    <div className="flex-[2] mx-[1vw]">
                        <p>AQI</p>
                        <p className="text-[1.5vw]">{currBrief.calamity?.aqi}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}