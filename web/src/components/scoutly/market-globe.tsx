// web/src/components/scoutly/market-globe.tsx
"use client";

import dynamic from "next/dynamic";

import type { GlobeConfig } from "@/components/ui/globe";

/*
 * The aceternity globe, recoloured for Scoutly: petrol landmasses on a deep
 * plane, and arcs tracing market-entry routes from where teams build into the
 * US and Europe, the markets Scoutly researches today. Amber marks the routes,
 * pale petrol the return traffic. three.js only runs in the browser, so the
 * globe loads client-side and its card reads fine before it arrives.
 */

const World = dynamic(() => import("@/components/ui/globe").then((m) => m.World), { ssr: false });

const AMBER = "#f4b740";
const PETROL = "#8fb8bd";

const CONFIG: GlobeConfig = {
  pointSize: 3,
  globeColor: "#14252d",
  showAtmosphere: true,
  atmosphereColor: PETROL,
  atmosphereAltitude: 0.12,
  emissive: "#0e1b22",
  emissiveIntensity: 0.15,
  shininess: 0.6,
  polygonColor: "rgba(143,184,189,0.7)",
  ambientLight: PETROL,
  directionalLeftLight: "#ffffff",
  directionalTopLight: "#ffffff",
  pointLight: "#ffffff",
  arcTime: 1400,
  arcLength: 0.9,
  rings: 1,
  maxRings: 3,
  // Over the Atlantic, so both target markets face the viewer first.
  initialPosition: { lat: 32, lng: -35 },
  autoRotate: true,
  autoRotateSpeed: 0.5,
};

const CITIES = {
  bengaluru: [12.97, 77.59],
  singapore: [1.35, 103.82],
  saoPaulo: [-23.55, -46.63],
  lagos: [6.52, 3.38],
  telAviv: [32.09, 34.78],
  sydney: [-33.87, 151.21],
  toronto: [43.65, -79.38],
  mexicoCity: [19.43, -99.13],
  sanFrancisco: [37.77, -122.42],
  newYork: [40.71, -74.01],
  austin: [30.27, -97.74],
  boston: [42.36, -71.06],
  london: [51.51, -0.13],
  berlin: [52.52, 13.4],
  paris: [48.86, 2.35],
  amsterdam: [52.37, 4.9],
} as const;

type City = keyof typeof CITIES;

const ROUTES: [City, City, number, number][] = [
  // from, to, wave, altitude
  ["bengaluru", "sanFrancisco", 1, 0.5],
  ["london", "newYork", 1, 0.2],
  ["saoPaulo", "newYork", 2, 0.3],
  ["singapore", "london", 2, 0.4],
  ["telAviv", "berlin", 3, 0.15],
  ["toronto", "boston", 3, 0.1],
  ["bengaluru", "london", 4, 0.3],
  ["lagos", "amsterdam", 4, 0.25],
  ["sydney", "sanFrancisco", 5, 0.5],
  ["mexicoCity", "austin", 5, 0.1],
  ["berlin", "newYork", 6, 0.3],
  ["paris", "sanFrancisco", 6, 0.4],
];

const ARCS = ROUTES.map(([from, to, order, arcAlt], index) => ({
  order,
  startLat: CITIES[from][0],
  startLng: CITIES[from][1],
  endLat: CITIES[to][0],
  endLng: CITIES[to][1],
  arcAlt,
  color: index % 3 === 2 ? PETROL : AMBER,
}));

export function MarketGlobe() {
  return <World data={ARCS} globeConfig={CONFIG} />;
}
