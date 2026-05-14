"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function AnalyticsPage() {
  const [topLocations, setTopLocations] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [trends, setTrends] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5002";
        
        const [topRes, recentRes, trendsRes] = await Promise.all([
          fetch(`${backendUrl}/analytics/top-locations`).catch(() => null),
          fetch(`${backendUrl}/analytics/recent-searches`).catch(() => null),
          fetch(`${backendUrl}/analytics/trends`).catch(() => null)
        ]);

        if (topRes && topRes.ok) {
          const topData = await topRes.json();
          if (topData.success) setTopLocations(topData.data);
        }

        if (recentRes && recentRes.ok) {
          const recentData = await recentRes.json();
          if (recentData.success) setRecentSearches(recentData.data);
        }

        if (trendsRes && trendsRes.ok) {
          const trendsData = await trendsRes.json();
          if (trendsData.success) setTrends(trendsData.data);
        }
      } catch (err) {
        console.error("Failed to fetch analytics:", err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalytics();
  }, []);

  // Find max values for CSS charts
  const maxSearches = Math.max(...topLocations.map(item => item.total_searches), 1);
  const maxTrends = Math.max(...trends.map(item => item.searches), 1);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center">
          <div className="h-12 w-12 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-xl font-semibold text-gray-500 tracking-tight">Gathering Insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFDFD] p-6 md:p-12 text-black font-sans">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-5xl font-extrabold tracking-tighter mb-2">Nivasa Insights</h1>
            <p className="text-gray-500 text-lg">Real-time data on urban exploration and user interests.</p>
          </div>
          <Link href="/" className="group relative inline-flex items-center justify-center px-8 py-3 font-bold text-white bg-black rounded-full overflow-hidden transition-all hover:scale-105 shadow-[0_10px_20px_rgba(0,0,0,0.2)]">
            <span className="relative z-10">Back to Map</span>
          </Link>
        </div>

        {/* Top Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col justify-center">
            <p className="text-gray-500 font-medium mb-1">Total Searches</p>
            <h3 className="text-5xl font-black tracking-tighter">
              {trends.reduce((acc, curr) => acc + curr.searches, 0)}
            </h3>
          </div>
          <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col justify-center">
            <p className="text-gray-500 font-medium mb-1">Most Popular City</p>
            <h3 className="text-4xl font-black tracking-tighter truncate">
              {topLocations.length > 0 ? topLocations[0].location : "N/A"}
            </h3>
          </div>
          <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 flex flex-col justify-center">
            <p className="text-gray-500 font-medium mb-1">Active Days</p>
            <h3 className="text-5xl font-black tracking-tighter">
              {trends.length}
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Trend Chart (CSS based) */}
          <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            <h2 className="text-2xl font-bold tracking-tight mb-8">Search Volume Over Time</h2>
            {trends.length === 0 ? (
              <p className="text-gray-400 italic">No trend data available.</p>
            ) : (
              <div className="flex items-end space-x-2 h-64 mt-4">
                {trends.map((item, idx) => {
                  const heightPercentage = (item.searches / maxTrends) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col justify-end items-center group relative">
                      <div className="absolute -top-10 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-xs py-1 px-2 rounded-lg font-semibold pointer-events-none whitespace-nowrap">
                        {item.searches} searches
                      </div>
                      <div 
                        className="w-full bg-gradient-to-t from-gray-900 to-gray-600 rounded-t-lg transition-all duration-500 group-hover:from-blue-600 group-hover:to-blue-400"
                        style={{ height: `${heightPercentage}%`, minHeight: '10%' }}
                      ></div>
                      <p className="text-[10px] text-gray-400 mt-2 font-medium truncate w-full text-center">
                        {new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Top Locations Bar Chart */}
          <div className="bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            <h2 className="text-2xl font-bold tracking-tight mb-8">Most Requested Locations</h2>
            {topLocations.length === 0 ? (
              <p className="text-gray-400 italic">No location data available.</p>
            ) : (
              <div className="space-y-5">
                {topLocations.map((item, idx) => {
                  const widthPercentage = (item.total_searches / maxSearches) * 100;
                  return (
                    <div key={idx} className="relative">
                      <div className="flex justify-between items-end mb-1">
                        <span className="font-semibold text-gray-800">{item.location}</span>
                        <span className="text-sm font-bold text-gray-500">{item.total_searches}</span>
                      </div>
                      <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-black rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${widthPercentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Searches Feed */}
          <div className="lg:col-span-2 bg-white p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100">
            <h2 className="text-2xl font-bold tracking-tight mb-8">Live Search Feed</h2>
            {recentSearches.length === 0 ? (
              <p className="text-gray-400 italic">No recent searches.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {recentSearches.map((item, idx) => (
                  <div key={idx} className="bg-gray-50 p-5 rounded-2xl border border-gray-100 hover:border-gray-300 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <span className="font-bold text-lg tracking-tight bg-white px-3 py-1 rounded-lg shadow-sm">{item.location}</span>
                      {item.timestamp && (
                        <span className="text-[11px] text-gray-400 font-medium uppercase tracking-wider mt-1">
                          {new Date(item.timestamp).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600 text-sm leading-relaxed mt-2 line-clamp-2">
                      <span className="text-black font-semibold mr-1">Looking for:</span>
                      "{item.prompt}"
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
