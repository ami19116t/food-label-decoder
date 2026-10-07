import express from 'express'; import axios from 'axios'; import mongoose from 'mongoose';
import Product from '../models/Product.js'; import { analyzeLabel, nutritionScore } from '../utils/labelAnalyzer.js';
const router=express.Router();
const OFF='https://world.openfoodfacts.org';
const dbReady=()=>mongoose.connection.readyState===1;

// Resilience for the external search service: retry transient failures and
// cache repeated searches briefly so a user does not need repeated clicks.
const searchCache = new Map();
const SEARCH_TTL = 5 * 60 * 1000;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function getWithRetry(url, config, attempts=3){
  let lastError;
  for(let attempt=0; attempt<attempts; attempt++){
    try { return await axios.get(url, config); }
    catch(e){
      lastError=e;
      const status=e.response?.status;
      const retryable=!status || status===408 || status===429 || status>=500;
      if(!retryable || attempt===attempts-1) throw e;
      const retryAfter=Number(e.response?.headers?.['retry-after']);
      await sleep(retryAfter>0 ? retryAfter*1000 : 700*Math.pow(2,attempt));
    }
  }
  throw lastError;
}
function shape(p){
 const n=p.nutriments||{}; const ingredientsText=p.ingredients_text_en||p.ingredients_text||'';
 const nutrition={calories:n['energy-kcal_100g']??null,carbohydrates:n.carbohydrates_100g??null,protein:n.proteins_100g??null,fat:n.fat_100g??null,saturatedFat:n['saturated-fat_100g']??null,sugars:n.sugars_100g??null,sodium:n.sodium_100g??null};
 return {barcode:p.code||'',productName:p.product_name||p.product_name_en||'Unknown product',brand:p.brands||'',imageUrl:p.image_front_url||p.image_url||'',ingredientsText,analysis:analyzeLabel(ingredientsText),nutrition,score:nutritionScore(nutrition),source:'Open Food Facts',analyzedAt:new Date()};
}
router.get('/barcode/:code',async(req,res)=>{try{
 if(dbReady()){const cached=await Product.findOne({barcode:req.params.code}).lean(); if(cached)return res.json({success:true,cached:true,product:cached});}
 const {data}=await axios.get(`${OFF}/api/v2/product/${encodeURIComponent(req.params.code)}.json`,{timeout:10000,headers:{'User-Agent':'FoodLabelDecoder-StudentProject/1.0'}});
 if(data.status!==1||!data.product)return res.status(404).json({success:false,message:'Product not found. Paste the ingredient label instead.'});
 const product=shape(data.product); if(dbReady()) await Product.findOneAndUpdate({barcode:product.barcode},product,{upsert:true,new:true,setDefaultsOnInsert:true});
 res.json({success:true,cached:false,product});
 }catch(e){res.status(502).json({success:false,message:'Could not fetch product data.',detail:e.message});}});

function isIndiaProduct(p) {
  const text = `${p?.countries || ''} ${(p?.countries_tags || []).join(' ')}`.toLowerCase();
  return text.includes('india') || text.includes('en:india');
}
router.get('/search', async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) return res.status(400).json({ success: false, message: 'Search query is required.' });

    const key = q.toLowerCase();
    const cached = searchCache.get(key);
    if (cached && Date.now() - cached.time < SEARCH_TTL) {
      return res.json({ success: true, cached: true, region: cached.region, products: cached.products });
    }

    const clean = q.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').replace(/\s+/g, ' ').trim();
    const isBiscuitQuery = /\b(biscuit|biscuits|cookie|cookies)\b/.test(clean);
    const isGenericBiscuit = isBiscuitQuery && clean.split(' ').length <= 3;

    const fields = [
      'code','product_name','product_name_en','brands','brands_tags','countries','countries_tags',
      'categories','categories_tags','image_front_url','image_url','ingredients_text','ingredients_text_en',
      'nutriments','complete','completeness','popularity_key','scans_n','unique_scans_n'
    ].join(',');

    // Open Food Facts v2 supports structured filters such as country/category and
    // popularity sorting, while legacy v1 is still the full-text search endpoint.
    // For a generic biscuit search we use the structured India/category query first,
    // then supplement it with full-text results so familiar Indian products rank first.
    let raw = [];

    if (isGenericBiscuit) {
      try {
        const { data } = await getWithRetry(`${OFF}/api/v2/search`, {
          params: {
            categories_tags_en: 'biscuits',
            countries_tags_en: 'india',
            sort_by: 'popularity_key',
            page: 1,
            page_size: 40,
            fields
          },
          timeout: 20000,
          headers: { 'User-Agent': 'FoodLabelDecoder/1.0 (student project)' }
        }, 3);
        raw.push(...(data.products || []));
      } catch (_) {
        // Continue to legacy full-text search below.
      }
    }

    // India-focused legacy full-text search. The tag filters are understood by
    // the legacy Product Opener search API and keep the first pass India-focused.
    try {
      const { data } = await getWithRetry(`${OFF}/cgi/search.pl`, {
        params: {
          search_terms: q,
          search_simple: 1,
          action: 'process',
          json: 1,
          page_size: isGenericBiscuit ? 40 : 24,
          tagtype_0: 'countries',
          tag_contains_0: 'contains',
          tag_0: 'india'
        },
        timeout: 20000,
        headers: { 'User-Agent': 'FoodLabelDecoder/1.0 (student project)' }
      }, 3);
      raw.push(...(data.products || []));
    } catch (_) {
      // Global fallback below.
    }

    // Global fallback is deliberately used only to fill gaps. It is ranked below
    // Indian products instead of replacing them.
    if (raw.length < 8 || !raw.some(p => isIndiaProduct(p))) {
      const { data } = await getWithRetry(`${OFF}/cgi/search.pl`, {
        params: {
          search_terms: q,
          search_simple: 1,
          action: 'process',
          json: 1,
          page_size: isGenericBiscuit ? 40 : 24
        },
        timeout: 20000,
        headers: { 'User-Agent': 'FoodLabelDecoder/1.0 (student project)' }
      }, 3);
      raw.push(...(data.products || []));
    }

    const unique = new Map();
    for (const p of raw) {
      if (!p?.code && !p?.product_name) continue;
      const id = String(p.code || `${p.product_name}|${p.brands || ''}`).trim();
      if (!unique.has(id)) unique.set(id, p);
    }

    const indiaBrands = [
      'parle-g','parle g','parle','britannia','good day','marie gold','bourbon','hide & seek',
      'hide and seek','sunfeast','dark fantasy','milk bikis','monaco','krackjack','krack jack',
      'jim jam','treat','50-50','fifty fifty','little hearts','oreo','unibic','cremica','harvest gold'
    ];

    const scoreProduct = p => {
      const name = String(p.product_name || p.product_name_en || '').toLowerCase();
      const brand = String(p.brands || '').toLowerCase();
      const countries = `${p.countries || ''} ${(p.countries_tags || []).join(' ')}`.toLowerCase();
      const categories = `${p.categories || ''} ${(p.categories_tags || []).join(' ')}`.toLowerCase();
      let score = 0;
      if (countries.includes('india') || countries.includes('en:india')) score += 100;
      if (categories.includes('biscuit') || categories.includes('cookie')) score += 35;
      if (isBiscuitQuery && /biscuit|cookie/.test(`${name} ${categories}`)) score += 25;
      for (const b of indiaBrands) {
        if (brand.includes(b) || name.includes(b)) { score += 45; break; }
      }
      if (name === clean) score += 30;
      if (name.includes(clean)) score += 20;
      if (p.ingredients_text_en || p.ingredients_text) score += 12;
      if (p.nutriments && (p.nutriments['energy-kcal_100g'] != null || p.nutriments.sugars_100g != null)) score += 8;
      // scans_n is a positive popularity signal; popularity_key itself is a rank,
      // so it is intentionally not added as a larger-is-better score.
      score += Math.min((Number(p.scans_n) || 0) / 1000, 15);
      return score;
    };

    const products = [...unique.values()]
      .filter(p => p.product_name)
      .sort((a, b) => scoreProduct(b) - scoreProduct(a))
      .slice(0, 12)
      .map(shape);

    const region = [...unique.values()].some(isIndiaProduct) ? 'India-focused' : 'Global fallback';
    searchCache.set(key, { time: Date.now(), products, region });
    if (searchCache.size > 50) searchCache.delete(searchCache.keys().next().value);

    res.json({ success: true, cached: false, region, products });
  } catch (e) {
    const status = e.response?.status;
    const message = status === 429
      ? 'Open Food Facts search is temporarily rate-limited. Please wait a few seconds and try again.'
      : 'Open Food Facts is temporarily unavailable. Please try again in a few seconds or use Paste Ingredient Label.';
    res.status(502).json({ success: false, message, detail: e.message });
  }
});
router.post('/analyze-label',(req,res)=>{const text=(req.body.ingredientsText||'').trim(); if(!text)return res.status(400).json({success:false,message:'ingredientsText is required.'}); res.json({success:true,analysis:analyzeLabel(text)});});
router.get('/:id',async(req,res)=>{try{if(!dbReady())return res.status(503).json({success:false,message:'Database not connected.'}); const p=await Product.findById(req.params.id); if(!p)return res.status(404).json({success:false,message:'Not found'}); res.json({success:true,product:p});}catch{res.status(400).json({success:false,message:'Invalid product id'});}});
export default router;
