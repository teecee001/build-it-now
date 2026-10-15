// Copied verbatim from src/pages/BillPay.tsx; keep in sync.
export const BILL_PROVIDERS: Record<string, { name: string; avgAmount: number }[]> = {
  Electric: [
    // US
    { name: "Duke Energy", avgAmount: 142.00 },
    { name: "Pacific Gas & Electric (PG&E)", avgAmount: 175.00 },
    { name: "Southern California Edison", avgAmount: 158.00 },
    { name: "Florida Power & Light", avgAmount: 135.00 },
    { name: "Dominion Energy", avgAmount: 128.00 },
    // UK & Europe
    { name: "British Gas", avgAmount: 120.00 },
    { name: "EDF Energy", avgAmount: 110.00 },
    { name: "Enel (Italy)", avgAmount: 95.00 },
    { name: "Iberdrola (Spain)", avgAmount: 105.00 },
    { name: "E.ON (Germany)", avgAmount: 130.00 },
    { name: "Vattenfall (Sweden)", avgAmount: 90.00 },
    // Africa
    { name: "PHCN / DisCos (Nigeria)", avgAmount: 45.00 },
    { name: "Eskom (South Africa)", avgAmount: 60.00 },
    { name: "Kenya Power (KPLC)", avgAmount: 35.00 },
    { name: "ECG Ghana", avgAmount: 30.00 },
    { name: "UMEME (Uganda)", avgAmount: 25.00 },
    { name: "TANESCO (Tanzania)", avgAmount: 28.00 },
    // Asia & Middle East
    { name: "DEWA (Dubai)", avgAmount: 150.00 },
    { name: "TEPCO (Japan)", avgAmount: 140.00 },
    { name: "Tata Power (India)", avgAmount: 40.00 },
    { name: "PLN (Indonesia)", avgAmount: 30.00 },
    { name: "Meralco (Philippines)", avgAmount: 55.00 },
    { name: "TNB (Malaysia)", avgAmount: 45.00 },
    // Americas
    { name: "Hydro-Québec (Canada)", avgAmount: 85.00 },
    { name: "CFE (Mexico)", avgAmount: 50.00 },
    { name: "Enel (Brazil)", avgAmount: 60.00 },
  ],
  Water: [
    // US
    { name: "American Water Works", avgAmount: 72.00 },
    { name: "Aqua America", avgAmount: 65.00 },
    { name: "California Water Service", avgAmount: 85.00 },
    // UK & Europe
    { name: "Thames Water (UK)", avgAmount: 55.00 },
    { name: "Severn Trent (UK)", avgAmount: 48.00 },
    { name: "Veolia (France)", avgAmount: 60.00 },
    // Africa
    { name: "Lagos Water Corp (Nigeria)", avgAmount: 15.00 },
    { name: "Rand Water (South Africa)", avgAmount: 25.00 },
    { name: "Nairobi Water (Kenya)", avgAmount: 12.00 },
    { name: "Ghana Water Company", avgAmount: 10.00 },
    // Asia & Middle East
    { name: "DEWA Water (Dubai)", avgAmount: 80.00 },
    { name: "Delhi Jal Board (India)", avgAmount: 8.00 },
    { name: "PUB (Singapore)", avgAmount: 35.00 },
    { name: "Manila Water (Philippines)", avgAmount: 18.00 },
    // Americas
    { name: "SABESP (Brazil)", avgAmount: 30.00 },
    { name: "CONAGUA (Mexico)", avgAmount: 20.00 },
  ],
  Internet: [
    // US
    { name: "Comcast Xfinity", avgAmount: 89.99 },
    { name: "AT&T Fiber", avgAmount: 79.99 },
    { name: "Verizon Fios", avgAmount: 74.99 },
    { name: "Spectrum (Charter)", avgAmount: 69.99 },
    { name: "Starlink", avgAmount: 120.00 },
    // UK & Europe
    { name: "BT Broadband (UK)", avgAmount: 45.00 },
    { name: "Virgin Media (UK)", avgAmount: 50.00 },
    { name: "Sky Broadband (UK)", avgAmount: 40.00 },
    { name: "Deutsche Telekom (Germany)", avgAmount: 45.00 },
    { name: "Orange (France)", avgAmount: 40.00 },
    // Africa
    { name: "MTN (Nigeria/Africa)", avgAmount: 25.00 },
    { name: "Airtel Africa", avgAmount: 20.00 },
    { name: "Safaricom (Kenya)", avgAmount: 22.00 },
    { name: "Glo (Nigeria)", avgAmount: 18.00 },
    { name: "Spectranet (Nigeria)", avgAmount: 30.00 },
    { name: "Telkom (South Africa)", avgAmount: 28.00 },
    // Asia & Middle East
    { name: "Jio Fiber (India)", avgAmount: 15.00 },
    { name: "du (UAE)", avgAmount: 80.00 },
    { name: "Etisalat (UAE)", avgAmount: 75.00 },
    { name: "PLDT (Philippines)", avgAmount: 35.00 },
    { name: "Telkomsel (Indonesia)", avgAmount: 20.00 },
    // Americas
    { name: "Rogers (Canada)", avgAmount: 75.00 },
    { name: "Telmex (Mexico)", avgAmount: 30.00 },
  ],
  Phone: [
    // US
    { name: "Verizon Wireless", avgAmount: 85.00 },
    { name: "AT&T Wireless", avgAmount: 80.00 },
    { name: "T-Mobile", avgAmount: 70.00 },
    { name: "Mint Mobile", avgAmount: 30.00 },
    // UK & Europe
    { name: "Vodafone (UK/Europe)", avgAmount: 35.00 },
    { name: "EE (UK)", avgAmount: 30.00 },
    { name: "Three (UK)", avgAmount: 25.00 },
    { name: "O2 (UK/Europe)", avgAmount: 28.00 },
    // Africa
    { name: "MTN Mobile (Africa)", avgAmount: 10.00 },
    { name: "Airtel Mobile (Africa)", avgAmount: 8.00 },
    { name: "Safaricom M-PESA (Kenya)", avgAmount: 12.00 },
    { name: "Glo Mobile (Nigeria)", avgAmount: 8.00 },
    { name: "9mobile (Nigeria)", avgAmount: 7.00 },
    { name: "Vodacom (South Africa)", avgAmount: 15.00 },
    // Asia & Middle East
    { name: "Jio (India)", avgAmount: 5.00 },
    { name: "Airtel India", avgAmount: 6.00 },
    { name: "Globe Telecom (Philippines)", avgAmount: 15.00 },
    { name: "AIS (Thailand)", avgAmount: 12.00 },
    { name: "STC (Saudi Arabia)", avgAmount: 40.00 },
    // Americas
    { name: "Telcel (Mexico)", avgAmount: 20.00 },
    { name: "Bell (Canada)", avgAmount: 65.00 },
  ],
  Streaming: [
    { name: "Netflix", avgAmount: 15.49 },
    { name: "Spotify Premium", avgAmount: 11.99 },
    { name: "Disney+ Bundle", avgAmount: 19.99 },
    { name: "HBO Max", avgAmount: 15.99 },
    { name: "Apple TV+", avgAmount: 9.99 },
    { name: "YouTube Premium", avgAmount: 13.99 },
    { name: "Hulu", avgAmount: 17.99 },
    { name: "Amazon Prime", avgAmount: 14.99 },
    { name: "Paramount+", avgAmount: 11.99 },
    { name: "Peacock Premium", avgAmount: 7.99 },
    { name: "DSTV / Showmax (Africa)", avgAmount: 12.00 },
    { name: "iROKOtv (Africa)", avgAmount: 5.00 },
    { name: "Hotstar (India)", avgAmount: 4.00 },
    { name: "Viu (Asia)", avgAmount: 5.00 },
    { name: "BBC iPlayer (UK)", avgAmount: 18.00 },
    { name: "Stan (Australia)", avgAmount: 10.00 },
  ],
  Rent: [
    { name: "Apartment Rent", avgAmount: 1850.00 },
    { name: "Mortgage Payment", avgAmount: 2200.00 },
    { name: "HOA Fees", avgAmount: 350.00 },
    { name: "Storage Unit", avgAmount: 125.00 },
    { name: "Parking Space", avgAmount: 200.00 },
    { name: "Office Rent", avgAmount: 3000.00 },
    { name: "Co-working Space", avgAmount: 250.00 },
  ],
};
