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
    description: "Explore a savings vault with a 6% APY target. It is a beta target, not a guaranteed rate, and no real interest is paid.",
    gradient: "from-warning/20 to-warning/5",
  },
  {
    icon: Globe,
    title: "Send money",
    description: "P2P-style sends by handle, email, or QR, using demo balances in the beta.",
    gradient: "from-cyan-500/20 to-cyan-500/5",
  },
  {
    icon: Zap,
    title: "Bills & rewards",
    description: "Bill pay flows and rewards you can try in the demo.",
    gradient: "from-destructive/20 to-destructive/5",
  },
];

const STATS = [
  { value: "$25", label: "Demo welcome bonus" },
  { value: "Live", label: "Market data" },
  { value: "Multi", label: "Currencies" },
  { value: "Beta", label: "Open to try" },
];

const TRUST_BADGES = [
  { icon: Shield, label: "Security-first design" },
  { icon: Lock, label: "Not a bank" },
  { icon: Users, label: "No real deposits" },
];

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Create your account",
    description: "Sign up with email in a couple of minutes. New accounts get a $25 welcome bonus in demo money.",
    icon: Sparkles,
  },
  {
    step: "02",
    title: "Explore the product",
    description: "Use demo balances, open Markets, and try convert flows. No real bank deposit required.",
    icon: Wallet,
  },
  {
    step: "03",
    title: "See the full vision",
    description: "Wallet, markets, savings, cards, and send, all in one app.",
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
    a: "Balances in the beta are demo (\"paper\") balances for product testing. No real money is held or moved, and the $25 welcome bonus is demo money too. You can explore the full flow without funding a real account.",
  },
  {
    q: "What can I try right now?",
    a: "Create an account, claim the $25 demo welcome bonus, browse live markets, convert between currencies in the demo, and walk through the main product screens.",
  },
  {
    q: "What about the 6% APY and cards?",
    a: "The 6% APY is a target shown in the product vision, not a guaranteed rate, and no real interest is paid in this beta. Live banking rails, cards, and yield would depend on partners and compliance, and are not part of this beta.",
  },
  {
    q: "Is my data safe?",
    a: "The site uses encrypted (HTTPS) connections and a managed sign-in service. This beta is for product experience, not production banking, so please avoid sharing sensitive personal or financial details.",
  },
  {
    q: "Who is this for?",
    a: "Anyone who wants to try the product, and partners or investors who want a working walkthrough of the vision.",
  },
];

export { FEATURES, STATS, TRUST_BADGES, HOW_IT_WORKS, FAQS };
