/* Pure copy selection. Does not calculate scores or accept open-answer text. */
(function(root){'use strict';
function validateCopy(bank,copy){
 const errors=[],seen=new Set(),covered=new Set();let count=0;
 if(!copy||copy.bankVersion!==bank.version||copy.rulesVersion!==bank.rulesVersion||!copy.copyVersion)errors.push('文案与题库/计分规则版本不一致');
 const dims=copy?.dimensions||{};
 if(Object.keys(dims).sort().join('')!=='ABCDEFGH')errors.push('文案必须包含且仅包含八维');
 const options=new Map(bank.questions.filter(q=>q.layer==='core'&&q.type==='choice').flatMap(q=>q.options.map(o=>[o.id,{...o,questionId:q.id}])));
 for(const [k,d] of Object.entries(dims)){
 if(d.name!==bank.dimensions[k]||!d.shortTitle?.trim()||!Array.isArray(d.coreExplanation)||!d.coreExplanation.length||d.coreExplanation.some(p=>typeof p!=='string'||!p.trim())||!Array.isArray(d.boundaries)||!d.boundaries.length||d.boundaries.some(p=>typeof p!=='string'||!p.trim()))errors.push(k+'基础文案缺失或名称不符');
 if(!Array.isArray(d.evidenceSentences)){errors.push(k+'证据句缺失');continue;}
 for(const sentence of d.evidenceSentences){count++;
 if(typeof sentence.id!=='string'||!sentence.id.startsWith(k+'-')||seen.has(sentence.id))errors.push('证据文案ID缺失或重复：'+sentence.id);seen.add(sentence.id);
 if(typeof sentence.text!=='string'||!sentence.text.trim()||typeof sentence.dedupeGroup!=='string'||!sentence.dedupeGroup.trim()||!Number.isFinite(sentence.priority))errors.push('证据文案字段错误：'+sentence.id);
 if(!Array.isArray(sentence.optionIds)||!sentence.optionIds.length){errors.push('证据选项ID缺失：'+sentence.id);continue;}
 for(const id of sentence.optionIds){if(!options.has(id)||options.get(id).dimension!==k||covered.has(id))errors.push('证据映射不存在、跨维或重复：'+id);covered.add(id);}
 }
 }
 if(count!==48||covered.size!==options.size||[...options.keys()].some(id=>!covered.has(id)))errors.push('必须完整覆盖48条正式核心选项证据');
 return {valid:errors.length===0,errors,evidenceCount:count,coveredOptionCount:covered.size};
}
function interpret(bank,copy,input){
 const check=validateCopy(bank,copy);if(!check.valid)throw Error(check.errors.join('；'));
 if(input.bankVersion!==copy.bankVersion||input.rulesVersion!==copy.rulesVersion)throw Error('答卷与文案版本不一致');
 if(input.coreAnswered<8)return [];
 const allowed=new Map(bank.questions.filter(q=>q.layer==='core'&&q.type==='choice').flatMap(q=>q.options.map(o=>[o.id,{questionId:q.id,dimension:o.dimension}])));
 const valid=(input.choiceEvidence||[]).filter(e=>{const o=allowed.get(e.optionId);return o&&e.layer==='core'&&e.status==='answered'&&e.questionId===o.questionId&&e.contribution?.dimension===o.dimension&&e.contribution.points===1;});
 return [...new Set(input.dimensionIds)].map(k=>{
 const d=copy.dimensions[k];if(!d)throw Error('未知文案维度');
 const actual=new Set(valid.filter(e=>e.contribution.dimension===k).map(e=>e.optionId));
 const groups=new Set(),texts=new Set(),chosen=[];
 for(const s of [...d.evidenceSentences].sort((a,b)=>a.priority-b.priority||a.id.localeCompare(b.id))){
 const ids=s.optionIds.filter(id=>actual.has(id));if(!ids.length||groups.has(s.dedupeGroup)||texts.has(s.text))continue;
 chosen.push({id:s.id,text:s.text,optionIds:ids,dedupeGroup:s.dedupeGroup});groups.add(s.dedupeGroup);texts.add(s.text);if(chosen.length===3)break;
 }
 return {dimensionId:k,name:d.name,shortTitle:d.shortTitle,coreExplanation:[...d.coreExplanation],boundaries:[...d.boundaries],evidenceSentences:chosen};
 });
}
const api={validateCopy,interpret};if(typeof module==='object'&&module.exports)module.exports=api;else root.TANarrativeV33=api;
})(typeof globalThis!=='undefined'?globalThis:this);
