// Maps country codes (ISO 3166-1 alpha-2) to currency codes
export const COUNTRY_TO_CURRENCY: Record<string, string> = {
  US: "USD", GB: "GBP", DE: "EUR", FR: "EUR", ES: "EUR", IT: "EUR", NL: "EUR",
  BE: "EUR", AT: "EUR", IE: "EUR", PT: "EUR", FI: "EUR", GR: "EUR", LU: "EUR",
  SK: "EUR", SI: "EUR", EE: "EUR", LV: "EUR", LT: "EUR", MT: "EUR", CY: "EUR",
  JP: "JPY", CN: "CNY", IN: "INR", KR: "KRW", AU: "AUD", CA: "CAD", CH: "CHF",
  MX: "MXN", BR: "BRL", ZA: "ZAR", RU: "RUB", SG: "SGD", HK: "HKD",
  NO: "NOK", SE: "SEK", DK: "DKK", NZ: "NZD", TR: "TRY", PL: "PLN",
  TH: "THB", ID: "IDR", HU: "HUF", CZ: "CZK", IL: "ILS", CL: "CLP",
  PH: "PHP", AE: "AED", SA: "SAR", MY: "MYR", RO: "RON", AR: "ARS",
  VN: "VND", BG: "BGN", HR: "EUR", NG: "NGN", KE: "KES", EG: "EGP",
  PK: "PKR", BD: "BDT", UA: "UAH", PE: "PEN", CO: "COP", TW: "TWD",
  QA: "QAR", KW: "KWD", BH: "BHD", OM: "OMR", JO: "JOD", MA: "MAD",
  TN: "TND", GH: "GHS", TZ: "TZS", UG: "UGX", RW: "RWF", ET: "ETB",
  CR: "CRC", PA: "PAB", DO: "DOP", GT: "GTQ", HN: "HNL", JM: "JMD",
  IS: "ISK", LK: "LKR", MM: "MMK", KH: "KHR", NP: "NPR", MN: "MNT",
  // Pacific Islands
  FJ: "FJD", PG: "PGK", WS: "WST", TO: "TOP", VU: "VUV", SB: "SBD",
  PW: "USD", FM: "USD", MH: "USD", KI: "AUD", TV: "AUD",
  // Caribbean
  BS: "BSD", BB: "BBD", TT: "TTD", GY: "GYD", SR: "SRD", BZ: "BZD",
  AG: "XCD", LC: "XCD", GD: "XCD", VC: "XCD", DM: "XCD", KN: "XCD",
  HT: "HTG", CU: "CUP",
  // Central Asia
  KZ: "KZT", UZ: "UZS", TM: "TMT", KG: "KGS", TJ: "TJS", AF: "AFN",
  AZ: "AZN", GE: "GEL", AM: "AMD",
};

// Country names for display
export const COUNTRY_NAMES: Record<string, string> = {
  US: "United States", GB: "United Kingdom", DE: "Germany", FR: "France",
  ES: "Spain", IT: "Italy", NL: "Netherlands", BE: "Belgium", AT: "Austria",
  IE: "Ireland", PT: "Portugal", FI: "Finland", GR: "Greece", JP: "Japan",
  CN: "China", IN: "India", KR: "South Korea", AU: "Australia", CA: "Canada",
  CH: "Switzerland", MX: "Mexico", BR: "Brazil", ZA: "South Africa",
  RU: "Russia", SG: "Singapore", HK: "Hong Kong", NO: "Norway", SE: "Sweden",
  DK: "Denmark", NZ: "New Zealand", TR: "Turkey", PL: "Poland", TH: "Thailand",
  ID: "Indonesia", HU: "Hungary", CZ: "Czech Republic", IL: "Israel",
  CL: "Chile", PH: "Philippines", AE: "UAE", SA: "Saudi Arabia",
  MY: "Malaysia", RO: "Romania", AR: "Argentina", VN: "Vietnam", BG: "Bulgaria",
  HR: "Croatia", NG: "Nigeria", KE: "Kenya", EG: "Egypt", PK: "Pakistan",
  BD: "Bangladesh", UA: "Ukraine", PE: "Peru", CO: "Colombia", TW: "Taiwan",
  QA: "Qatar", KW: "Kuwait", BH: "Bahrain", OM: "Oman", JO: "Jordan",
  MA: "Morocco", TN: "Tunisia", GH: "Ghana", TZ: "Tanzania", UG: "Uganda",
  RW: "Rwanda", ET: "Ethiopia", CR: "Costa Rica", PA: "Panama",
  DO: "Dominican Republic", GT: "Guatemala", HN: "Honduras", JM: "Jamaica",
  IS: "Iceland", LK: "Sri Lanka", MM: "Myanmar", KH: "Cambodia", NP: "Nepal",
  MN: "Mongolia",
};
