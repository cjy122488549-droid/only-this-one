/* Atomic benchmark selector. No scoring, free text, random selection or partial reuse. */
(function(root){'use strict';
const RULE={minimumCoreAnswers:8,topDimensions:['C','D'],exactTie:true,requiredOptionIds:['Q1-C','S-Q1-B','S-Q2-B'],specialPathIds:['S2']};
function validate(bank,copy,c){const errors=[];
 if(c?.schemaVersion!==1||c.narrativeVersion!=='NARRATIVE-1.1'||c.copyVersion!=='NARRATIVE-1.1-BENCHMARK-CD-S2-V1'||c.bankVersion!==bank.version||c.rulesVersion!==bank.rulesVersion||c.baseCopyVersion!==copy.copyVersion||c.approved!==true||c.atomic!==true)errors.push('标杆配置版本、批准状态或整份报告声明不符');
 if(JSON.stringify(c?.appliesWhen)!==JSON.stringify(RULE))errors.push('标杆适用条件与已批准规则不符');
 if(typeof c?.title!=='string'||!c.title.trim()||typeof c.subtitle!=='string'||!c.subtitle.trim()||!Array.isArray(c.acts)||c.acts.length!==4){errors.push('标杆标题或四幕结构不完整');return {valid:false,errors};}
 const seen=new Set();c.acts.forEach((a,i)=>{if(a.id!==['I','II','III','IV'][i]||typeof a.blockId!=='string'||seen.has(a.blockId)||typeof a.title!=='string'||!a.title||!Array.isArray(a.segments)||!a.segments.length||a.segments.some(s=>!['paragraph','heading'].includes(s.kind)||typeof s.text!=='string'||!s.text))errors.push('标杆幕结构错误：'+a.id);seen.add(a.blockId);});
 return {valid:!errors.length,errors};
}
function select(bank,copy,c,input){const v=validate(bank,copy,c);if(!v.valid)throw Error(v.errors.join('；'));
 const reasons=[];
 if(input.bankVersion!==bank.version||input.rulesVersion!==bank.rulesVersion)reasons.push('answer-version-mismatch');
 const valid=[];const seen=new Set();for(const e of input.choices||[]){const q=bank.questions.find(q=>q.type==='choice'&&q.id===e.questionId),o=q?.options.find(o=>o.id===e.optionId);if(q&&o&&e.status==='answered'&&e.layer===q.layer&&e.contribution?.dimension===o.dimension&&e.contribution.points===1&&!seen.has(q.id)){seen.add(q.id);valid.push({questionId:q.id,optionId:o.id,dimensionId:q.layer==='core'?o.dimension:null,pathId:q.layer==='special'?o.dimension:null});}}
 const core=valid.filter(e=>e.dimensionId);if(input.coreAnswered<8||core.length<8||core.length!==input.coreAnswered)reasons.push('insufficient-core-evidence');
 const top=[...(input.top||[])].sort();if(input.prototype!=='dual'||top.join(',')!=='C,D')reasons.push('not-exact-CD-dual');
 const raw=input.raw||{};if(!(raw.C>0&&raw.C===raw.D)||Object.keys(bank.dimensions).some(k=>!['C','D'].includes(k)&&raw[k]>=raw.C))reasons.push('not-exclusive-highest-tie');
 const counted=Object.fromEntries(Object.keys(bank.dimensions).map(k=>[k,0]));core.forEach(e=>counted[e.dimensionId]++);if(Object.keys(counted).some(k=>counted[k]!==raw[k]))reasons.push('scores-evidence-mismatch');
 for(const id of RULE.requiredOptionIds)if(!valid.some(e=>e.optionId===id))reasons.push('missing-'+id);
 const special=valid.filter(e=>e.pathId);if(special.length!==2||special.some(e=>e.pathId!=='S2'))reasons.push('not-two-S2-answers');
 if(reasons.length)return {matched:false,benchmarkId:c.id,copyVersion:c.copyVersion,reasons};
 const all=valid.map(e=>({...e})),cd=core.filter(e=>['C','D'].includes(e.dimensionId));
 const sources=[all.filter(e=>e.optionId==='Q1-C'),cd,special,[...cd,...special]];
 const conditions={...RULE,coreAnswered:input.coreAnswered,topDimensions:top,scoreC:raw.C,scoreD:raw.D};
 return {matched:true,benchmarkId:c.id,narrativeVersion:c.narrativeVersion,copyVersion:c.copyVersion,title:c.title,subtitle:c.subtitle,conditions,acts:c.acts.map((a,i)=>({id:a.id,blockId:a.blockId,title:a.title,segments:a.segments.map((s,j)=>({...s,segmentId:a.blockId+'-'+(j+1)})),matchedEvidence:sources[i],appliesWhen:c.appliesWhen,conditions,fallback:false,fallbackReason:null}))};
}
const api={validate,select};if(typeof module==='object'&&module.exports)module.exports=api;else root.TABenchmarkV33=api;
})(typeof globalThis!=='undefined'?globalThis:this);
