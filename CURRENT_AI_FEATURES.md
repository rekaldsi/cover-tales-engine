# KØDEX AI-Powered Features

## Overview
KØDEX has multiple AI-powered features built-in for intelligent collection management.

## 1. Smart CSV Import

### Location
- `src/components/import/CSVImportWizard.tsx`
- `src/hooks/useCSVImport.ts`
- Supabase Edge Function: `analyze-csv`
- Supabase Edge Function: `import-csv`

### How It Works

**Step 1: Upload**
- Accepts any CSV file
- Automatically detects columns and sample data
- No specific format required

**Step 2: AI Column Analysis**
- Calls `analyze-csv` Edge Function
- AI intelligently maps CSV columns to comic fields
- Works with ANY column names (flexible matching):
  - "Issue" → `issue_number`
  - "Title" → `title`
  - "Price" / "Value" / "Cost" → `current_value`
  - "Grade" / "Condition" → `grade`
  - "CGC" / "CBCS" / "Raw" → `grade_status`
  - And many more variations

**Step 3: Review Mappings**
- Shows AI confidence scores (High/Medium/Low)
- User can manually adjust mappings
- Only "Title" field is required

**Step 4: Smart Import**
- Calls `import-csv` Edge Function
- Imports all comics
- Triggers automatic enrichment (see below)

### Example: Star Wars Collection CSV

Your CSV with columns like:
```csv
Issue,Price,Grade
Star Wars #1,150,9.2
Star Wars #2,75,8.5
```

Will automatically map to:
- "Issue" → Parse title + issue number
- "Price" → current_value
- "Grade" → grade

## 2. Automatic Data Enrichment

### Location
- `src/hooks/useBackgroundEnrichment.ts`
- Runs automatically after import

### What It Does

**Cover Images:**
- Fetches from Comic Vine API
- Falls back to alternative sources
- Caches for performance

**Key Issue Detection:**
- Identifies first appearances
- Origin stories
- Death issues
- Important storylines
- Automatically adds key issue badges

**Metadata Enrichment:**
- Writer names
- Artist names
- Cover artists
- Publication dates
- Publisher info

**Value Updates:**
- Fetches from GoCollect
- eBay sold listings
- Multiple sources for accuracy
- Regular updates

### Progress Tracking
Shows progress bar during enrichment:
- "Enriching collection data..."
- "X of Y comics"

## 3. Signing Recommendations

### Location
- `src/components/signings/SigningRecommendations.tsx`
- Displayed on Dashboard

### Analysis Algorithm

**Data Collection:**
- Scans all comics in collection
- Tracks writers, artists, cover artists
- Counts comics per creator
- Calculates total value per creator
- Identifies key issues per creator

**Scoring Formula:**
```
Score = (keyIssueCount * 100) + totalValue
```

**Recommendations:**
Shows top 3 creators where:
- You own 3+ of their comics
- Prioritizes creators with key issues
- Higher value work ranked higher

**Display:**
- Creator name
- Number of comics you own
- Key issue count (if any)
- Total value of their work
- Links to signing events page

**Example Output:**
```
Stan Lee
5 comics · $3.2k value · ⭐ 2 key issues

Why: You own Amazing Spider-Man #1 and #50 (key issues).
Getting these signed could increase value 20-50%.
```

## 4. Value Tracking & Analytics

### Location
- `src/hooks/usePortfolioSnapshots.ts`
- `src/components/dashboard/PortfolioChart.tsx`

### What It Tracks
- Daily portfolio value
- Percentage changes
- 30-day trends
- Top movers (comics increasing/decreasing in value)

### Historical Analysis
- Stores snapshots in database
- Generates trend charts
- Shows value changes over time
- Identifies best performers

## 5. Hunting Mode Intelligence

### Location
- `src/components/scanner/HuntingMode.tsx`
- `src/components/scanner/ContinuousHunting.tsx`

### AI Features

**Cover Recognition:**
- Uses Claude Vision AI
- Identifies title, issue, publisher
- Detects variant covers
- Recognizes graded slabs

**Value Aggregation:**
- Multi-source pricing (GoCollect + eBay)
- Confidence scoring
- Value ranges (low/high estimates)
- Real-time market data

**Collection Checking:**
- Variant-aware matching
- Shows "OWNED" if you have it
- Displays copy count for duplicates
- "Missing" badge if not in collection

**Purchase Decision:**
- "GET IT!" - $50+ value or key issue
- "CONSIDER" - $15-49 value or issue #1
- "PASS" - Below $15 value

**Caching:**
- LRU cache (50 entries, 5-minute TTL)
- Instant results for recently scanned comics

## 6. Grading Recommendations

### Location
- `src/hooks/useGradingOpportunities.ts` (if exists)
- Dashboard grading section

### Analysis
- Identifies raw comics worth grading
- Calculates grading cost vs value increase
- ROI analysis
- Recommends grading company (CGC/CBCS)

**Example:**
```
Amazing Spider-Man #15
Current: Raw 8.0 = $200
Graded: CGC 8.0 = $450
Profit: $250 (after $50 grading fee)
ROI: 125%
```

## API Integrations

### Comic Data
- **Comic Vine API** - Metadata, covers
- **GoCollect** - Price data, trends
- **eBay** - Sold listings, market prices
- **ComicBookRealm** - Alternative pricing

### AI Services
- **Claude AI** (Anthropic) - Vision, text analysis
- **Supabase Edge Functions** - Serverless AI processing

## How to Use

### CSV Import
1. Go to Dashboard
2. Click "Import CSV" button
3. Upload your CSV file
4. Review AI-suggested mappings
5. Click "Start Import"
6. Wait for enrichment to complete

### Signing Recommendations
1. Visible on Dashboard automatically
2. Shows top 3 opportunities
3. Click creator name to see details
4. Links to signing events

### Hunting Mode
1. Click "Hunting Mode" button
2. Point camera at comic book
3. Wait for recognition
4. See instant value + recommendation
5. Check "OWNED" status

## Future Enhancements

### Planned AI Features
- Historical price prediction
- Collection gap analysis
- Market trend alerts
- Personalized buying recommendations
- Automatic run detection (e.g., "You own #1-4, missing #5-7")

---

**Last Updated:** 2026-01-12
**Version:** 1.0.0
