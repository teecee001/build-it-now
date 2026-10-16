import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plane, Car, ShoppingBag, Map, Calendar, MapPin, Search, ArrowLeft } from "lucide-react";

type Hub = "flights" | "rides" | "shopping" | "trips" | "events" | "places";

type Item = { id: string; title: string; sub: string; details: string };

const HUBS: { id: Hub; label: string; icon: typeof Plane }[] = [
  { id: "flights", label: "Flights", icon: Plane },
  { id: "rides", label: "Rides", icon: Car },
  { id: "shopping", label: "Shopping", icon: ShoppingBag },
  { id: "trips", label: "Trips", icon: Map },
  { id: "events", label: "Events", icon: Calendar },
  { id: "places", label: "Places", icon: MapPin },
];

const MOCK: Record<Hub, Item[]> = {
  flights: [
    { id: "f1", title: "LOS → LHR", sub: "Direct · $842 · Oct 22", details: "British Airways · 6h 40m · Economy · 1 bag included. Test booking only." },
    { id: "f2", title: "LOS → DXB", sub: "1 stop · $615 · Oct 25", details: "Emirates · via DOH · 9h 15m · Economy. Test booking only." },
  ],
  rides: [
    { id: "r1", title: "UberX", sub: "4 min · $12", details: "Standard sedan · 4 seats · Cashless. Test estimate only." },
    { id: "r2", title: "Bolt", sub: "6 min · $9", details: "Economy · 4 seats · Slightly cheaper. Test estimate only." },
  ],
  shopping: [
    { id: "s1", title: "Wireless earbuds", sub: "From $49 · 4.2★", details: "Multiple retailers · Free shipping over $50 · 30-day returns. Test listing." },
    { id: "s2", title: "Running shoes", sub: "From $89 · 4.5★", details: "Nike, Adidas, local stores · Size chart available. Test listing." },
  ],
  trips: [
    { id: "t1", title: "Weekend in Accra", sub: "2 nights · from $180", details: "Hotel + airport transfer option. Fully customizable. Test itinerary." },
  ],
  events: [
    { id: "e1", title: "Afrobeats night", sub: "Fri · $25", details: "Doors 8pm · General admission · 18+. Test ticket." },
  ],
  places: [
    { id: "p1", title: "Local restaurant", sub: "Open · 4.1★", details: "Nigerian & continental · Reservations available · 15 min away. Test listing." },
  ],
};

export default function LifeHubs() {
  const [hub, setHub] = useState<Hub>("flights");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Item | null>(null);
  const items = MOCK[hub].filter((i) => i.title.toLowerCase().includes(q.toLowerCase()));

  if (selected) {
    return (
      <div className="space-y-4 p-4 max-w-2xl mx-auto">
        <Button variant="ghost" size="sm" onClick={() => setSelected(null)} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>
        <Card className="p-5">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">{selected.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{selected.sub}</p>
            </div>
            <Badge variant="secondary">Test</Badge>
          </div>
          <p className="text-sm mt-4 leading-relaxed">{selected.details}</p>
          <Button className="w-full mt-5" disabled>
            Book inside ExoSky (coming with partner keys)
          </Button>
          <p className="text-[11px] text-muted-foreground text-center mt-2">
            No external redirect. Booking activates once the partner API is connected.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Exo Life</h1>
        <Badge variant="secondary">Test mode</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Search and details stay inside ExoSky. Test data only until partner APIs are connected.
      </p>

      <div className="grid grid-cols-3 gap-2">
        {HUBS.map((h) => {
          const Icon = h.icon;
          const active = hub === h.id;
          return (
            <button
              key={h.id}
              onClick={() => { setHub(h.id); setQ(""); setSelected(null); }}
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
          <Card key={item.id} className="p-3 flex items-center justify-between cursor-pointer hover:bg-secondary/40" onClick={() => setSelected(item)}>
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
        Full booking and payment stay in-app once partner keys are added.
      </p>
    </div>
  );
}
