# GST Filing App

A modern, web-based application for processing GST (Goods and Services Tax) invoice data and generating GSTR-1 compliant JSON files for the Indian GST Portal.

![Next.js](https://img.shields.io/badge/Next.js-16.0-black?logo=next.js)
![React](https://img.shields.io/badge/React-19.2-blue?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4.1-38bdf8?logo=tailwindcss)

## ✨ Features

- **📊 Excel Import**: Upload Excel files with invoice data using the provided template
- **🔍 Smart Parsing**: Automatic header detection and column mapping
- **✅ Real-time Validation**: Validate GSTINs, dates, tax rates, and amounts with detailed error reporting
- **📈 Dashboard View**: Visual summary of invoices, tax liability, and validation status
- **🔄 B2B & CDNR Support**: Handle both B2B sales invoices and Credit/Debit notes (CDNR)
- **📥 Portal-Ready JSON Export**: Generate GSTR-1 JSON with all metadata fields required by GST Portal
- **🌓 Dark Mode**: Beautiful UI with dark mode support
- **🔒 Local Processing**: All data processing happens in your browser - no data sent to servers

### Recent Updates (Jan 2025)

- **Portal Metadata Fields**: JSON now includes `flag`, `updby`, `cflag`, and `fil_dt` for direct portal upload
- **Rate-Based Item Numbers**: Uses GST portal convention (e.g., `1801` for 18% rate)
- **Smart HSN Quantity**: Services (HSN starting with 99) automatically have `qty: 0`
- **CGST/SGST Auto-Sync**: Template automatically copies CGST% to SGST%
- **Zero-Value Field Omission**: Omits `iamt`, `camt`, `samt` when zero (portal convention)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Srikrishnan2003/gst-filing-software.git
   cd gst-filing-software
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## 📋 Usage

### Step 1: Download Template
Download the GST Excel template from the application or use `/public/GST_Template.xlsx`

### Step 2: Fill Your Data
Enter your invoice data in the template:
- **B2B Sheet**: For sales invoices to registered businesses
- **CDNR Sheet**: For Credit/Debit notes
- **SGST% auto-fills** when you enter CGST%

#### Required Fields for B2B:
| Column | Description | Example |
|--------|-------------|---------|
| GSTIN | Buyer's 15-digit GSTIN | 29ABCDE1234F1Z5 |
| Invoice No | Unique invoice number | INV-001 |
| Invoice Date | Date in DD-MM-YYYY | 15-01-2024 |
| Invoice Value | Total invoice amount | 11800 |
| Place of Supply | 2-digit state code | 29 |
| Rate | GST rate (5, 12, 18, 28) | 18 |
| Taxable Value | Value before tax | 10000 |
| IGST/CGST/SGST | Tax amounts | 1800/900/900 |

### Step 3: Upload & Review
Upload your filled Excel file and review the parsed data. Fix any validation errors shown.

### Step 4: Generate JSON
Enter your GSTIN and filing period, then download the GSTR-1 JSON file.

### Step 5: Upload to GST Portal
Upload the generated JSON directly to the GST Portal for filing.

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | React framework with App Router |
| **React 19** | UI library |
| **TypeScript** | Type safety |
| **Tailwind CSS 4** | Styling |
| **Zustand** | State management |
| **Zod** | Schema validation |
| **xlsx** | Excel file parsing |
| **shadcn/ui** | UI components |
| **Recharts** | Charts and visualizations |

## 📁 Project Structure

```
gst-filing-app/
├── app/                    # Next.js App Router
│   ├── page.tsx           # Main dashboard page
│   ├── layout.tsx         # Root layout
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── dashboard-shell.tsx
│   ├── file-dropzone.tsx
│   ├── invoice-table.tsx
│   ├── metric-card.tsx
│   ├── process-stepper.tsx
│   ├── tax-summary.tsx
│   └── validation-banner.tsx
├── lib/
│   ├── schemas/          # Zod schemas
│   │   ├── gst-schema.ts # B2B invoice schema
│   │   └── cdnr-schema.ts # CDNR schema
│   ├── services/         # Business logic
│   │   ├── excel-processor.ts
│   │   ├── json-parser.ts
│   │   └── processors/
│   │       ├── b2b-processor.ts
│   │       └── cdnr-processor.ts
│   └── utils.ts
├── store/
│   └── gst-store.ts      # Zustand store
├── public/
│   └── GST_Template.xlsx # Excel template
└── package.json
```

## 📄 JSON Output Format

The app generates GSTR-1 compliant JSON with full portal metadata:

- **b2b**: B2B invoices grouped by customer GSTIN (with `flag`, `updby`, `cflag`)
- **cdnr**: Credit/Debit notes (when applicable)
- **hsn**: HSN-wise summary of supplies (Services have `qty: 0`)
- **doc_issue**: Document issue summary
- **fil_dt**: Filing date

Example output structure:
```json
{
  "gstin": "33XXXXXXXXX1Z5",
  "fp": "122025",
  "filing_typ": "M",
  "b2b": [
    {
      "ctin": "29AAGFL8538G2ZV",
      "cfs": "N",
      "inv": [{
        "inum": "18/2025-26",
        "idt": "26-12-2025",
        "val": 28143,
        "pos": "29",
        "rchrg": "N",
        "inv_typ": "R",
        "flag": "U",
        "updby": "S",
        "cflag": "N",
        "itms": [{ "num": 1801, "itm_det": { "rt": 18, "txval": 23850, "iamt": 4293 }}]
      }]
    }
  ],
  "hsn": { "flag": "N", "hsn_b2b": [...], "hsn_b2c": [] },
  "doc_issue": { "flag": "N", "doc_det": [...] },
  "fil_dt": "10-01-2026"
}
```

## 🔧 Development

### Available Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Adding New Features

1. **New Invoice Types**: Add schema in `/lib/schemas/` and processor in `/lib/services/processors/`
2. **UI Components**: Use shadcn/ui patterns in `/components/`
3. **State Management**: Extend the Zustand store in `/store/gst-store.ts`

## 📝 Validation Rules

The app validates:

- ✅ **GSTIN Format**: 15-character alphanumeric pattern
- ✅ **Date Format**: DD-MM-YYYY
- ✅ **Tax Rates**: Must be 0, 5, 12, 18, or 28%
- ✅ **Mandatory Fields**: Invoice number, date, GSTIN, taxable value
- ✅ **Numeric Values**: Positive numbers for amounts and quantities
- ✅ **State Codes**: Valid 2-digit state codes

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is private and intended for internal use.

## 🙋 Support

For issues or feature requests, please open an issue on the repository.

---

**Disclaimer**: This application is a helper tool for GST filing. Always verify the generated JSON against official GST Portal requirements before submission.
