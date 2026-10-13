import {
  Shield, Zap, TrendingUp, CreditCard,
  Globe, Gift, PiggyBank, Smartphone,
  Lock, Users, Wallet, Sparkles,
} from "lucide-react";

const FEATURES = [
  {
    icon: Wallet,
    title: "Multi-currency wallet",
    description: "USD, EUR, GBP, NGN and more in one place. Convert between them in the app.",
    gradient: "from-accent/20 to-accent/5",
  },
  {
    icon: TrendingUp,
    title: "Markets",
    description: "Live crypto, stocks, FX, commodities, and indices on one screen.",
    gradient: "from-blue-500/20 to-blue-500/5",
  },
  {
    icon: CreditCard,
    title: "Cards",
    description: "Virtual and metal card designs with controls you can manage in the app.",
    gradient: "from-purple-500/20 to-purple-500/5",
  },
  {
    icon: PiggyBank,
    title: "Savings",
    description: "A savings experience built around a clear 6% APY target, with no lock-up story.",
    gradient: "from-warning/20 to-warning/5",
  },
  {
    icon: Globe,
    title: "Send money",
    description: "P2P-style sends by handle, email, or QR. Built for speed and low fees.",
    gradient: "from-cyan-500/20 to-cyan-500/5",
  },
  {
    icon: Zap,
    title: "Bills & rewards",
    description: "Bill pay flows and a simple cashback story on everyday spend.",
    gradient: "from-destructive/20 to-destructive/5",
  },
];

const STATS = [
  { value: "$25", label: "Welcome bonus" },
  { value: "Live", label: "Market data" },
  { value: "Multi", label: "Currencies" },
  { value: "Beta", label: "Open to try" },
];

const TRUST_BADGES = [
  { icon: Shield, label: "Security-first design" },
  { icon: Lock, label: "Encrypted by default" },
  { icon: Users, label: "Built for compliance" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create your account",
    description: "Sign up with email in a couple of minutes. New accounts get a $25 welcome bonus in the demo.",
    icon: Sparkles,
  },
  {
    step: "02",
    title: "Explore the product",
    description: "Use paper balances, open Markets, and try convert flows. No real bank deposit required.",
    icon: Wallet,
  },
  {
    step: "03",
    title: "See the full vision",
    description: "Wallet, markets, savings, cards, and send. One app path from day one.",
    icon: TrendingUp,
  },
];

const FAQS = [
  {
    q: "Is this a real bank?",
    a: "No. ExoSky is a product demo in beta. It is not a bank and does not move real customer deposits today.",
  },
  {
    q: "Is the money real?",
    a: "Balances in the beta are paper balances for product testing and demos. You can explore the full flow without funding a real account.",
  },
  {
    q: "What can I try right now?",
    a: "Create an account, claim the welcome bonus, browse live markets, convert between currencies in the demo, and walk through the main product screens.",
  },
  {
    q: "What about the 6% APY and cards?",
    a: "Those are part of the product vision you can explore in the app. Live banking rails, cards, and yield will come with partners and compliance, not in this beta.",
  },
  {
    q: "Is my data safe?",
    a: "We take security seriously: encrypted connections, careful auth, and a design that assumes stronger controls as we grow. This beta is for product experience, not production banking.",
  },
  {
    q: "Who is this for?",
    a: "Anyone who wants to try the product, and partners or investors who want a working walkthrough of the vision.",
  },
];

export { FEATURES, STATS, TRUST_BADGES, HOW_IT_WORKS, FAQS };
