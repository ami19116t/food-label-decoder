# Food Label Decoder

A full-stack MERN student project that searches/scans packaged foods, retrieves product data from Open Food Facts, analyzes ingredient labels for common INS/E additives, palm oil, hidden/added sugar terms and refined flour, and presents a simple nutrition traffic-light signal.

## Added practical features
- Paste-label fallback for products missing from Open Food Facts.
- MongoDB cache, but the backend still works if MongoDB is temporarily unavailable.
- English/Hindi UI toggle.
- Responsive barcode scanner for phone/webcam.
- Educational disclaimer and cautious wording ("High caution" rather than medical claims).

## Run it
### Backend
```bash
cd backend
cp .env.example .env
# Put your MongoDB Atlas connection string in .env (optional for demo)
npm install
npm run dev
```
Backend: http://localhost:5000

### Frontend
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend: http://localhost:5173

## Fastest demo if MongoDB is not ready
Leave `MONGO_URI` unset. Search, barcode lookup, and paste-label analysis still work; only caching is disabled.

## Demo ingredient text
```text
Refined wheat flour (maida), sugar, palm oil, glucose syrup, milk solids, raising agents INS 500(ii), INS 503(ii), emulsifier INS 322, flavour enhancer INS 621.
```

## Suggested demo flow
1. Search `Oreo` or `Maggi`.
2. Select a product and show ingredient flags + nutrition.
3. Toggle Hindi.
4. Paste the demo ingredient text to show the fallback analyzer.
5. If presenting on a phone/laptop with camera permission, scan a barcode.

## Notes
Open Food Facts is community-maintained, so some products have incomplete data. The app does not provide medical advice and does not claim an ingredient is inherently unsafe; it explains configured label signals.
