import {useState} from 'react';
import axios from 'axios';
import {ClipboardPaste,Leaf,Database,ShieldCheck,Scale,Plus,Check,Trash2,Search,MapPin,Star} from 'lucide-react';
import Navbar from './components/Navbar';
import SearchBar from './components/SearchBar';
import BarcodeScanner from './components/BarcodeScanner';
import TrafficLightScore from './components/TrafficLightScore';
import FlagBadges from './components/FlagBadges';
import AdditivesTable from './components/AdditivesTable';
import NutritionPanel from './components/NutritionPanel';

const T={
 en:{search:'Search product (e.g. Oreo, Maggi, biscuits)',go:'Search',scan:'Scan barcode',score:'Nutrition traffic light',scoreNote:'Based on sugar, saturated fat and sodium per 100g.',palm:'Contains palm oil',sugars:'hidden/added sugar terms detected',maida:'Base contains refined wheat flour (maida)',noFlags:'No configured red flags detected',additives:'INS / additive breakdown',name:'Name',purpose:'Purpose',noneAdd:'No mapped INS/E codes detected.',nutrition:'Nutrition breakdown',per100:'per 100 g',cal:'Calories',carb:'Carbohydrates',protein:'Protein',fat:'Total fat',sat:'Saturated fat',sugar:'Sugars',sodium:'Sodium',paste:'Paste ingredient label',analyze:'Analyze label',pastePh:'Paste ingredients exactly as written on the pack…',results:'Search results',choose:'Choose a product',compare:'Compare products',compareHint:'Select 2–4 products to compare',selected:'selected',compareNow:'Compare now',clear:'Clear',comparison:'Product comparison',better:'Lower is generally preferable for sugar, saturated fat and sodium; higher protein is preferable.',noData:'No data',flags:'Ingredient flags',wins:'Metric wins',indiaResults:'India-focused results',globalResults:'Global fallback results',suggested:'Quick searches',disclaimer:'Educational interpretation only. Always check the product pack and professional dietary advice for medical needs.'},
 hi:{search:'उत्पाद खोजें (जैसे Oreo, Maggi, biscuits)',go:'खोजें',scan:'बारकोड स्कैन',score:'पोषण ट्रैफिक लाइट',scoreNote:'प्रति 100 ग्राम चीनी, संतृप्त वसा और सोडियम पर आधारित।',palm:'पाम ऑयल मिला हुआ है',sugars:'छिपी/अतिरिक्त चीनी के नाम मिले',maida:'बेस में रिफाइंड गेहूं का आटा (मैदा) है',noFlags:'कॉन्फ़िगर किए गए रेड फ्लैग नहीं मिले',additives:'INS / एडिटिव विवरण',name:'नाम',purpose:'उद्देश्य',noneAdd:'कोई मैप किया INS/E कोड नहीं मिला।',nutrition:'पोषण विवरण',per100:'प्रति 100 ग्राम',cal:'कैलोरी',carb:'कार्बोहाइड्रेट',protein:'प्रोटीन',fat:'कुल वसा',sat:'संतृप्त वसा',sugar:'चीनी',sodium:'सोडियम',paste:'इंग्रीडिएंट लेबल पेस्ट करें',analyze:'विश्लेषण करें',pastePh:'पैक पर लिखी सामग्री यहाँ पेस्ट करें…',results:'खोज परिणाम',choose:'उत्पाद चुनें',compare:'उत्पाद तुलना',compareHint:'तुलना के लिए 2–4 उत्पाद चुनें',selected:'चयनित',compareNow:'तुलना करें',clear:'साफ़ करें',comparison:'उत्पाद तुलना',better:'चीनी, संतृप्त वसा और सोडियम में कम तथा प्रोटीन में अधिक मात्रा सामान्यतः बेहतर मानी जाती है।',noData:'डेटा नहीं',flags:'इंग्रीडिएंट फ्लैग',wins:'बेहतर मेट्रिक्स',indiaResults:'भारत-केंद्रित परिणाम',globalResults:'ग्लोबल वैकल्पिक परिणाम',suggested:'त्वरित खोज',disclaimer:'यह केवल शैक्षणिक व्याख्या है। चिकित्सा/डाइट संबंधी जरूरतों के लिए पैक और विशेषज्ञ की सलाह देखें।'}
};

const num=v=>Number.isFinite(Number(v))?Number(v):null;
function comparisonWinner(products,key,lower=true){
 const vals=products.map(p=>num(p.nutrition?.[key]));
 const valid=vals.map((v,i)=>v===null?null:i).filter(i=>i!==null);
 if(!valid.length)return -1;
 return valid.reduce((best,i)=>{
   if(best===-1)return i;
   const a=vals[i],b=vals[best];
   return lower?(a<b?i:best):(a>b?i:best);
 },-1);
}
function flagCount(p){const a=p.analysis||{};return (a.flags?.palmOil?1:0)+(a.flags?.hiddenSugar?1:0)+(a.flags?.refinedFlour?1:0)+(a.additives?.length||0);}
function winsFor(products,i){
 const metrics=[['sugars',true],['saturatedFat',true],['sodium',true],['protein',false]];
 return metrics.reduce((n,[key,lower])=>n+(comparisonWinner(products,key,lower)===i?1:0),0);
}

function CompareSection({products,t,onClear}){
 const keys=[['calories','Calories'],['sugars','Sugars'],['saturatedFat','Saturated fat'],['sodium','Sodium'],['protein','Protein'],['carbohydrates','Carbohydrates'],['fat','Total fat']];
 const wins=products.map((_,i)=>winsFor(products,i));
 const bestIndex=wins.indexOf(Math.max(...wins));
 return <section className="compareSection">
  <div className="sectionHead"><div><h2 className="sectionTitle"><Scale size={22}/> {t.comparison}</h2><p className="compareSub">{t.better}</p></div><button className="clearBtn" onClick={onClear}><Trash2 size={15}/> {t.clear}</button></div>
  <div className="comparisonSummary">{products.map((p,i)=><div className={`summaryCard ${i===bestIndex?'bestSummary':''}`} key={i}><div className="summaryTop">{p.imageUrl&&<img src={p.imageUrl}/>}<div><b>{p.productName}</b><small>{p.brand||'Unknown brand'}</small></div></div><div className="summaryScore">{wins[i]} {t.wins}{i===bestIndex&&<span><Star size={13}/> Best among selected</span>}</div></div>)}</div>
  <div className="compareTableWrap"><table className="compareTable"><thead><tr><th>Metric</th>{products.map((p,i)=><th key={i}>{p.imageUrl&&<img src={p.imageUrl}/>}<span>{p.productName}</span></th>)}</tr></thead><tbody>
   {keys.map(([key,label])=>{const winner=key==='protein'?comparisonWinner(products,key,false):comparisonWinner(products,key,true);return <tr key={key}><td>{label}</td>{products.map((p,i)=><td key={i} className={i===winner?'winner':''}>{num(p.nutrition?.[key])===null?t.noData:`${p.nutrition[key]} ${key==='calories'?'kcal':'g'}`}{i===winner&&<Check size={14}/>}</td>)}</tr>})}
   <tr><td>{t.flags}</td>{products.map((p,i)=><td key={i} className="flagCell">{flagCount(p)}</td>)}</tr>
   <tr><td>Palm oil</td>{products.map((p,i)=><td key={i}>{p.analysis?.flags?.palmOil?'⚠ Yes':'✓ No'}</td>)}</tr>
   <tr><td>Hidden sugar</td>{products.map((p,i)=><td key={i}>{p.analysis?.flags?.hiddenSugar?'⚠ Yes':'✓ No'}</td>)}</tr>
   <tr><td>Refined flour</td>{products.map((p,i)=><td key={i}>{p.analysis?.flags?.refinedFlour?'⚠ Yes':'✓ No'}</td>)}</tr>
  </tbody></table></div>
 </section>
}

export default function App(){
 const [language,setLanguage]=useState('en'),[query,setQuery]=useState(''),[product,setProduct]=useState(null),[results,setResults]=useState([]),[region,setRegion]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState(''),[scanner,setScanner]=useState(false),[paste,setPaste]=useState(''),[pasteAnalysis,setPasteAnalysis]=useState(null),[compare,setCompare]=useState([]);
 const t=T[language];
 async function search(term=query){const q=term.trim();if(!q||loading)return;setQuery(q);setLoading(true);setError('');try{const {data}=await axios.get('/api/products/search',{params:{q}});setResults(data.products||[]);setRegion(data.region||'');setProduct(null);setCompare([]);if(!data.products?.length)setError('No matching products found. Try another name or paste the ingredient label.');}catch(e){setError(e.response?.data?.message||'Search failed');}finally{setLoading(false)}}
 async function barcode(code){setScanner(false);setLoading(true);setError('');try{const {data}=await axios.get(`/api/products/barcode/${encodeURIComponent(code)}`);setProduct(data.product);setResults([]);setCompare([]);}catch(e){setError(e.response?.data?.message||'Barcode lookup failed');}finally{setLoading(false)}}
 async function analyzePaste(){if(!paste.trim())return;setLoading(true);setError('');try{const {data}=await axios.post('/api/products/analyze-label',{ingredientsText:paste});setPasteAnalysis(data.analysis);}catch(e){setError(e.response?.data?.message||'Analysis failed');}finally{setLoading(false)}}
 function toggleCompare(p){setCompare(prev=>prev.some(x=>x.barcode===p.barcode&&x.productName===p.productName)?prev.filter(x=>!(x.barcode===p.barcode&&x.productName===p.productName)):prev.length<4?[...prev,p]:prev)}
 const quick=['Biscuits','Oreo','Parle-G','Britannia Good Day','Marie Gold','Maggi'];
 return <><Navbar language={language} setLanguage={setLanguage}/><main>
  <section className="hero"><div className="eyebrow"><ShieldCheck size={16}/> Ingredient intelligence for everyday packaged food</div><h1>Decode the label.<br/><span>Choose with clarity.</span></h1><p>Search or scan packaged food to reveal additives, hidden sugar terms, palm oil, refined flour and nutrition signals — with an India-focused search for common products.</p><SearchBar query={query} setQuery={setQuery} onSearch={()=>search()} onScan={()=>setScanner(true)} loading={loading} t={t}/>
   <div className="quickSearch"><span><Search size={14}/> {t.suggested}</span>{quick.map(x=><button key={x} onClick={()=>search(x)} disabled={loading}>{x}</button>)}</div>
   <div className="trust"><span><Database/>Open Food Facts</span><span><Leaf/>Ingredient analysis</span><span><MapPin/>India-focused product ranking</span><span><ShieldCheck/>No login required</span></div>
  </section>
  {error&&<div className="error">{error}</div>}
  {results.length>0&&<section><div className="sectionHead"><div><h2 className="sectionTitle">{t.results}</h2><p className="compareSub">{region==='India-focused'?t.indiaResults:t.globalResults} • {t.compareHint}</p></div>{compare.length>=2&&<button className="compareNow" onClick={()=>document.getElementById('comparison')?.scrollIntoView({behavior:'smooth'})}><Scale size={16}/> {t.compareNow} ({compare.length})</button>}</div>
   <div className="productGrid">{results.map((p,i)=>{const selected=compare.some(x=>x.barcode===p.barcode&&x.productName===p.productName);return <div className={`productCardWrap ${selected?'selectedCard':''}`} key={`${p.barcode}-${i}`}><button className="productCard" onClick={()=>{setProduct(p);setResults([]);window.scrollTo({top:500,behavior:'smooth'})}}>{p.imageUrl?<img src={p.imageUrl}/>:<div className="imgFallback">🍱</div>}<div><b>{p.productName}</b><small>{p.brand||'Unknown brand'}</small></div></button><button className={`selectCompare ${selected?'selected':''}`} onClick={()=>toggleCompare(p)}>{selected?<><Check size={15}/> {t.selected}</>:<><Plus size={15}/> {t.compare}</>}</button></div>})}</div>
  </section>}
  {compare.length>0&&<div className="compareBar"><span><Scale size={18}/> {compare.length} {t.selected}</span><div>{compare.map((p,i)=><span className="miniProduct" key={i}>{p.productName}</span>)}</div><button onClick={()=>document.getElementById('comparison')?.scrollIntoView({behavior:'smooth'})} disabled={compare.length<2}>{t.compareNow}</button></div>}
  {compare.length>=2&&<div id="comparison"><CompareSection products={compare} t={t} onClear={()=>setCompare([])}/></div>}
  {product&&<section className="dashboard"><div className="productHero">{product.imageUrl&&<img src={product.imageUrl}/>}<div><small>{product.brand}</small><h2>{product.productName}</h2><p className="ingredients">{product.ingredientsText||'Ingredient text unavailable for this product.'}</p><FlagBadges analysis={product.analysis} t={t}/></div></div><TrafficLightScore score={product.score} t={t}/><div className="twoCol"><AdditivesTable items={product.analysis?.additives} t={t}/><NutritionPanel n={product.nutrition} t={t}/></div></section>}
  <section className="pasteCard"><div><div className="iconBox"><ClipboardPaste/></div><h2>{t.paste}</h2><p>Useful when a regional product is missing from the online database.</p></div><div className="pasteForm"><textarea value={paste} onChange={e=>setPaste(e.target.value)} placeholder={t.pastePh}/><button onClick={analyzePaste} disabled={loading}>{t.analyze}</button></div>{pasteAnalysis&&<div className="pasteResult"><FlagBadges analysis={pasteAnalysis} t={t}/><AdditivesTable items={pasteAnalysis.additives} t={t}/></div>}</section><p className="disclaimer">{t.disclaimer}</p></main>{scanner&&<BarcodeScanner onDetected={barcode} onClose={()=>setScanner(false)}/>}</>
}
