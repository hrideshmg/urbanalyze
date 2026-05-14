"use client";
import ProductBrief from "@/components/data_display/prod_brief";
import SampleResults from "@/components/search_elements/results";
import SearchBar from "@/components/search_elements/search_bar";
import { useEffect, useState } from "react";
import Image from "next/image";
import axios from "axios";
import { ACCESS_FILTER, ACCESS_TOKEN_NAME } from "../_constants/constants";
import { useCoords } from "../_context/CoordsContext";
import Link from "next/link";
import FilterTags from "@/components/search_elements/filter_tags";
import dynamic from 'next/dynamic';

// Dynamically import the Map component with ssr disabled
const Map = dynamic(
  () => import("@/components/map_elements/map"),
  { ssr: false } // This ensures the component only loads on the client side
);

export default function MapsTest() {
  const { settlementData, setSettlementData } = useCoords();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedData = localStorage.getItem(ACCESS_TOKEN_NAME);
    if (storedData) {
      setSettlementData(JSON.parse(storedData));
    }
  }, []);

  const [currBrief, setCurrBrief] = useState({});
  const [currIndex, setCurrIndex] = useState(null);
  const [focusPos, setFocusPos] = useState(null);

  useEffect(() => {
    if (currIndex != null) {
      setCurrBrief(settlementData[currIndex]);
    }
  }, [currIndex, settlementData]);

  useEffect(() => {
    if (settlementData.length > 0) {
      setFocusPos(settlementData[0].address.location);
    }
  }, [settlementData]);

  return (
    <div className="flex-1 flex">
      <div className="bg-light flex-1 h-screen flex flex-col px-[1vw] max-h-screen overflow-y-scroll">
        <div className="text-black bg-light text-[3vw] py-[1vw] font-semibold sticky top-0">
          <Link className="tracking-tighter" href="/">NIVASA</Link>
          <FilterTags />
        </div>
        <div className="flex-1">
          <SampleResults
            open={open}
            setOpen={setOpen}
            setCurrIndex={setCurrIndex}
            currIndex={currIndex}
            setFocusPos={setFocusPos}
          />
        </div>
      </div>
      <div className="bg-light flex-[3] flex justify-end">
        <div className="rounded-[3vw] bg-red-300 flex-1 overflow-hidden">
          {mounted && focusPos && (
            <Map
              focusPos={focusPos}
              setFocusPos={setFocusPos}
            />
          )}
        </div>
        <ProductBrief open={open} setOpen={setOpen} currBrief={currBrief} />
      </div>
    </div>
  );
}
