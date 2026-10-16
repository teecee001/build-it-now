import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plane, Car, ShoppingBag, Map, Calendar, MapPin, Search } from "lucide-react";

type Hub = "flights" | "rides" | "shopping" | "trips" | "events" | "places";

const HUBS: { id: Hub; label: string; icon: typeof Plane; hint: string }[] = [
  { id: "flights", label: "Flights", icon: Plane, hint: "Search routes, times, prices (test mode)" },
  { id: "rides", label: "Rides", icon: Car, hint: "Uber, Bolt and alternatives (test mode)" },
  { id: "shopping", label: "Shopping", icon: ShoppingBag, hint: "Stores and products (test mode)" },
  { id: "trips", label: "Trips", icon: Map, hint: "Hotels and itineraries (test mode)" },
  { id: "events", label: "Events", icon: Calendar, hint: "Tickets and dates (test mode)" },
  { id: "places", label: "Places", icon: MapPin, hint: "Restaurants and spots (test mode)" },
];

const MOCK: Record<Hub, { title: string; sub: string }[]> = {
  flights: [
    { title: "LOS → LHR", sub: "Direct · $842 · Oct 22" },
    { title: "LOS → DXB", sub: "1 stop · $615 · Oct 25" },
  ],
  rides: [
    { title: "UberX", sub: "4 min · $12" },
    { title: "Bolt", sub: "6 min · $9" },
  ],
  shopping: [
    { title: "Wireless earbuds", sub: "From $49 · 4.2★" },
    { title: "Running shoes", sub: "From $89 · 4.5★" },
  ],
  trips: [
    { title: "Weekend in Accra", sub: "2 nights · from $180" },
  ],
  events: [
    { title: "Afrobeats night", sub: "Fri · $25" },
  ],
  places: [
    { title: "Local restaurant", sub: "Open · 4.1★" },
  ],
};

export default function LifeHubs() {
  const [hub, setHub] = useState<Hub>("flights");
  const [q, setQ] = useState("");
  const items = MOCK[hub].filter((i) => i.title.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Exo Life</h1>
        <Badge variant="secondary">Test mode</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Search and details happen inside ExoSky. Booking uses test data until partner APIs are connected.
      </p>

      <div className="grid grid-cols-3 gap-2">
        {HUBS.map((h) => {
          const Icon = h.icon;
          const active = hub === h.id;
          return (
            <button
              key={h.id}
              onClick={() => setHub(h.id)}
              className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs ${
                active ? "bg-secondary border-primary/40" : "bg-card border-border"
              }`}
            >
              <Icon className="w-4 h-4" />
              {h.label}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${HUBS.find((h) => h.id === hub)?.label.toLowerCase()}...`}
          className="pl-9"
        />
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <Card key={item.title} className="p-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.sub}</p>
            </div>
            <Button size="sm" variant="outline">View</Button>
          </Card>
        ))}
        {items.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-6">No results</p>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground text-center">
        Full booking and payment stay in-app once partner keys (Duffel, ride APIs, etc.) are added. This is test data only.
      </p>
    </div>
  );
}
