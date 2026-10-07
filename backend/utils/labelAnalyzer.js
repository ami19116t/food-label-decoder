import { ADDITIVES, PALM_OILS, SUGARS, REFINED_FLOUR } from '../data/additives.js';
const normalize = (s='') => s.toLowerCase().replace(/\s+/g,' ').replace(/\(\s+/g,'(').replace(/\s+\)/g,')').trim();
const uniq = arr => [...new Set(arr)];
export function analyzeLabel(raw=''){
  const text = normalize(raw);
  const codeRegex = /(?:ins|e)\s*[-:]?\s*(\d{3,4}[a-z]?)(?:\s*\(\s*([ivx]+)\s*\))?/gi;
  const codes=[]; let m;
  while((m=codeRegex.exec(text))!==null){
    const base=m[1].toLowerCase(); const info=ADDITIVES[base];
    if(info) codes.push({code:`INS ${base.toUpperCase()}${m[2]?`(${m[2]})`:''}`,name:info[0],purpose:info[1]});
    else codes.push({code:`INS ${base.toUpperCase()}${m[2]?`(${m[2]})`:''}`,name:'Unmapped additive',purpose:'Check packaging/regulatory source'});
  }
  // Also catch bare common codes in phrases such as "raising agents 500(ii), 503(ii)".
  for(const key of Object.keys(ADDITIVES)){
    const re=new RegExp(`(?:^|[^0-9])${key}(?:\\s*\\([ivx]+\\))?(?:[^0-9]|$)`,'i');
    if(re.test(text) && !codes.some(x=>x.code.includes(key.toUpperCase()))){ const [name,purpose]=ADDITIVES[key]; codes.push({code:`INS ${key.toUpperCase()}`,name,purpose}); }
  }
  const hiddenSugars=uniq(SUGARS.filter(x=>text.includes(x)));
  const oils=uniq(PALM_OILS.filter(x=>text.includes(x)));
  const refinedFlour=uniq(REFINED_FLOUR.filter(x=>text.includes(x)));
  return { additives:codes, hiddenSugars, oils, baseIngredients:refinedFlour,
    flags:{ palmOil:oils.length>0, hiddenSugar:hiddenSugars.length>0, refinedFlour:refinedFlour.length>0 } };
}
export function nutritionScore(n={}){
  const sugar=Number(n.sugars)||0, sat=Number(n.saturatedFat)||0, sodium=Number(n.sodium)||0;
  const red = sugar>22.5 || sat>5 || sodium>0.6;
  const amber = sugar>5 || sat>1.5 || sodium>0.12;
  return red ? {level:'red',label:'High caution'} : amber ? {level:'amber',label:'Moderate caution'} : {level:'green',label:'Better choice'};
}
