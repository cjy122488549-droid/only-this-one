(function(root){'use strict';
const SCHEMA=1,STATUSES=['unanswered','answered','skipped','not_applicable'];
function inspect(bank){
 const expected=[...Array.from({length:12},(_,i)=>'Q'+(i+1)),'S-Q1','S-Q2','S-Q3'];
 const ids=bank.questions.map(q=>q.id),missing=expected.filter(id=>!ids.includes(id));
 const errors=[];
 if(new Set(ids).size!==ids.length||ids.some(id=>!expected.includes(id)))errors.push('题目ID重复或非法');
 for(const q of bank.questions){
 const core=/^Q\d+$/.test(q.id),isText=q.id==='S-Q3';
 if(q.layer!==(core?'core':'special')||q.type!==(isText?'text':'choice')||!q.prompt)errors.push(q.id+' 结构错误');
 if(!isText){const opts=q.options||[];if(opts.length!==4||new Set(opts.map(o=>o.id)).size!==4||opts.some((o,i)=>!['A','B','C','D'].includes(o.label)||o.id!==q.id+'-'+o.label||!o.text||!(core?bank.dimensions:bank.paths)[o.dimension]))errors.push(q.id+' 选项或映射错误');}
 }
 if(bank.version==='V3.3'&&!missing.length){const counts=Object.fromEntries('ABCDEFGH'.split('').map(k=>[k,0]));for(const q of bank.questions.filter(q=>q.layer==='core'))for(const o of q.options||[])if(o.dimension in counts)counts[o.dimension]++;if(Object.values(counts).some(n=>n!==6))errors.push('V3.3八维必须各出现6次');}
 return {missing,errors,ready:!missing.length&&!errors.length&&bank.status==='ready'};
}
function requireReady(bank){if(!inspect(bank).ready)throw Error('V3.3正式题库尚未齐全，不能作答或计分');}
function fresh(bank){return {schemaVersion:SCHEMA,bankVersion:bank.version,rulesVersion:bank.rulesVersion,context:{kind:'',duration:''},step:0,answers:Object.fromEntries(bank.questions.map(q=>[q.id,{status:'unanswered'}]))};}
function compatible(bank,s){return !!s&&s.schemaVersion===SCHEMA&&s.bankVersion===bank.version&&s.rulesVersion===bank.rulesVersion&&s.answers&&typeof s.answers==='object'&&!Array.isArray(s.answers);}
function normalize(bank,s){
 if(!compatible(bank,s))throw Error('答卷版本不兼容，请重新开始；旧版答卷未迁移');
 const clean=fresh(bank);for(const k of ['kind','duration'])if(typeof s.context?.[k]==='string')clean.context[k]=s.context[k];clean.step=Number.isInteger(s.step)?Math.max(0,Math.min(bank.questions.length-1,s.step)):0;
 for(const q of bank.questions){const a=s.answers[q.id];if(!a||!STATUSES.includes(a.status))continue;
 if(a.status!=='answered'){clean.answers[q.id]={status:a.status};continue;}
 if(q.type==='text'){if(typeof a.text==='string'&&a.text.trim())clean.answers[q.id]={status:'answered',text:a.text};}
 else if(q.options.some(o=>o.id===a.optionId))clean.answers[q.id]={status:'answered',optionId:a.optionId};
 }return clean;
}
function setAnswer(bank,s,qid,answer){const q=bank.questions.find(q=>q.id===qid);if(!q)throw Error('未知题目');if(!answer||!STATUSES.includes(answer.status))throw Error('未知作答状态');if(answer.status==='answered'&&(q.type==='text'?typeof answer.text!=='string'||!answer.text.trim():!q.options.some(o=>o.id===answer.optionId)))throw Error('无效答案');const next=normalize(bank,s);next.answers[qid]={...answer};return normalize(bank,next);}
function coverage(bank,s,layer){const qs=bank.questions.filter(q=>q.layer===layer),c={total:qs.length,answered:0,unanswered:0,skipped:0,not_applicable:0};for(const q of qs)c[s.answers[q.id].status]++;return c;}
function score(bank,input){requireReady(bank);const s=normalize(bank,input),raw=Object.fromEntries(Object.keys(bank.dimensions).map(k=>[k,0])),specialRaw=Object.fromEntries(Object.keys(bank.paths).map(k=>[k,0])),evidence=[];
 for(const q of bank.questions){const a=s.answers[q.id],o=q.type==='choice'&&a.status==='answered'?q.options.find(o=>o.id===a.optionId):null;
 if(o)(q.layer==='core'?raw:specialRaw)[o.dimension]++;
 evidence.push({questionId:q.id,layer:q.layer,prompt:q.prompt,status:a.status,optionId:o?o.id:null,optionText:o?o.text:null,text:q.type==='text'&&a.status==='answered'?a.text:null,contribution:o?{dimension:o.dimension,points:1}:null});}
 const core=coverage(bank,s,'core'),special=coverage(bank,s,'special'),maximum=Math.max(...Object.values(raw)),ranked=Object.keys(raw).filter(k=>maximum>0&&raw[k]===maximum),determinate=core.answered>=8&&maximum>0;
 const top=determinate?ranked:[],levels=[...new Set(Object.values(raw).filter(v=>v>0))].sort((a,b)=>b-a),second=determinate?Object.keys(raw).filter(k=>raw[k]===levels[1]):[];
 const specials=evidence.filter(e=>['S-Q1','S-Q2'].includes(e.questionId)&&e.contribution).map(e=>e.contribution.dimension),paths=specials.length===2?[...new Set(specials)]:[];
 return {bankVersion:bank.version,rulesVersion:bank.rulesVersion,context:s.context,raw,specialRaw,core,special,evidence,total:Object.values(raw).reduce((a,b)=>a+b,0),top,second,prototype:!determinate?'undetermined':top.length===1?'single':top.length===2?'dual':'multiple',paths,specialResult:specials.length!==2?'undetermined':paths.length===1?'single':'dual'};
}
function storageKey(bank){return 'why-ta:'+bank.version+':'+bank.rulesVersion;}
function restore(bank,storage){try{const raw=storage.getItem(storageKey(bank));return {state:raw?normalize(bank,JSON.parse(raw)):fresh(bank),warning:''};}catch{return {state:fresh(bank),warning:'本地答卷不可用或版本不符，已建立新答卷；旧版记录不会用于新版计分。'};}}
function persist(bank,s,storage){try{storage.setItem(storageKey(bank),JSON.stringify(normalize(bank,s)));return true;}catch{return false;}}
const api={inspect,fresh,normalize,setAnswer,score,restore,persist,storageKey};if(typeof module==='object'&&module.exports)module.exports=api;else root.TAEngineV33=api;
})(typeof globalThis!=='undefined'?globalThis:this);
