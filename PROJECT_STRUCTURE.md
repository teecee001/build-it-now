# ExoSky Currency Converter - Project Structure

## 📁 Organized Code Structure

```
exosky-currency-converter/
│
├── public/                      # Static assets
│   ├── robots.txt              # SEO robots configuration
│   ├── favicon.ico             # Site favicon
│   └── placeholder.svg         # Placeholder images
│
├── src/                        # Source code
│   ├── components/             # React components
│   │   ├── ui/                # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   ├── sonner.tsx
│   │   │   └── ... (other UI primitives)
│   │   │
│   │   ├── CurrencyConverter.tsx    # Main currency converter component
│   │   ├── CryptoChart.tsx          # Real-time crypto chart component
│   │   ├── ConversionHistory.tsx    # Conversion history display
│   │   └── NavLink.tsx              # Navigation link wrapper
│   │
│   ├── constants/              # Application constants
│   │   └── currencies.ts       # 198 currencies (98 fiat + 100 crypto) & exchange rates
│   │
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-mobile.tsx     # Mobile detection hook
│   │   └── use-toast.ts       # Toast notification hook
│   │
│   ├── lib/                    # Utility libraries
│   │   └── utils.ts           # Common utility functions (cn, etc.)
│   │
│   ├── pages/                  # Page components
│   │   ├── Index.tsx          # Home page (main converter page)
│   │   └── NotFound.tsx       # 404 error page
│   │
│   ├── types/                  # TypeScript type definitions
│   │   └── index.ts           # Shared types (ConversionResult, Currency)
│   │
│   ├── App.tsx                 # Main app component with routing
│   ├── main.tsx               # Application entry point
│   ├── index.css              # Global styles & design system tokens
│   ├── App.css                # App-specific styles
│   └── vite-env.d.ts          # Vite TypeScript definitions
│
├── index.html                  # HTML entry point
├── vite.config.ts             # Vite configuration
├── tailwind.config.ts         # Tailwind CSS configuration
├── tsconfig.json              # TypeScript configuration
├── eslint.config.js           # ESLint configuration
├── package.json               # Dependencies and scripts
└── README.md                  # Project documentation

```

## 🎨 Design System

### Color Tokens (HSL - index.css)
All colors are defined as semantic tokens in `src/index.css`:
- `--background` - Main background color
- `--foreground` - Main text color
- `--primary` - Primary brand color
- `--secondary` - Secondary UI elements
- `--accent` - Accent highlights
- `--muted` - Muted text/backgrounds
- `--card` - Card backgrounds
- `--border` - Border colors

### Gradients
- `--gradient-primary` - Main brand gradient
- `--gradient-accent` - Accent gradient for highlights

### Design Principles
1. All colors MUST use HSL format
2. Use semantic tokens from design system
3. Never hardcode colors in components
4. Customize shadcn components with proper variants

## 🏗️ Architecture Patterns

### Component Organization
- **UI Components** (`components/ui/`) - Reusable, customizable shadcn primitives
- **Feature Components** (`components/`) - Business logic components
- **Page Components** (`pages/`) - Route-level components

### Data Flow
```
constants/currencies.ts  →  CurrencyConverter.tsx  →  Index.tsx
                                    ↓
                          ConversionHistory.tsx
```

### Type Safety
- Shared types in `src/types/index.ts`
- Imported across components for consistency
- No duplicate type definitions

## 📊 Key Features

### Currency Support
- **98 Traditional Currencies** - All major fiat currencies worldwide
- **100 Cryptocurrencies** - Bitcoin, Ethereum, and 98 other cryptos
- Defined in: `src/constants/currencies.ts`

### Real-time Chart
- 100 cryptocurrencies with mock price data
- Line chart visualization using recharts
- Located in: `src/components/CryptoChart.tsx`

### Conversion History
- Tracks all currency conversions
- Displays timestamp and conversion details
- Located in: `src/components/ConversionHistory.tsx`

## 🛠️ Technology Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool & dev server
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **React Router** - Routing
- **Recharts** - Chart visualization
- **React Query** - Data fetching (configured)

## 🚀 Development

### File Modification Rules
1. Always check `useful-context` before reading files
2. Use `lov-line-replace` for most edits
3. Use `lov-write` only for new files or complete rewrites
4. Never modify read-only files (package.json, etc.)

### Adding New Features
1. Create types in `src/types/` if needed
2. Add constants to appropriate file in `src/constants/`
3. Build components in `src/components/`
4. Wire up in pages (`src/pages/`)
5. Update design tokens in `src/index.css` as needed

## 📝 Code Style

### Imports Order
```typescript
// 1. External libraries
import { useState } from "react";
import { SomeLibrary } from "some-library";

// 2. UI components
import { Button } from "@/components/ui/button";

// 3. Feature components
import { CurrencyConverter } from "@/components/CurrencyConverter";

// 4. Constants, types, utilities
import { CURRENCIES } from "@/constants/currencies";
import { ConversionResult } from "@/types";
```

### Component Structure
```typescript
// 1. Imports
// 2. Types/Interfaces
// 3. Component definition
// 4. Hooks
// 5. Event handlers
// 6. JSX return
```

## 🎯 Best Practices

1. **Separation of Concerns**: Constants and types separated from components
2. **Type Safety**: Shared types prevent duplication
3. **Design System**: All styling through semantic tokens
4. **Component Reusability**: UI primitives customized for specific use cases
5. **Clean Architecture**: Clear folder structure with logical grouping
