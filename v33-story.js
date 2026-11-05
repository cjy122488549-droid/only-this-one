/* Deterministic four-act assembly. No free-text interpretation, no scoring changes. */
(function(root){'use strict';
function slots(c){const a=c.acts;return [...Object.values(a.prologue.options),a.prologue.neutral,...Object.values(a.dynamics.dimensions),a.dynamics.multipleOverview,a.dynamics.undetermined,...Object.values(a.meaning.paths),a.meaning.dualBridge,a.meaning.singleClue,a.meaning.missing,...Object.values(a.ending)];}
function validate(bank,copy,c){const errors=[],missing=[];
 if(c?.schemaVersion!==1||c.narrativeVersion!=='NARRATIVE-1.0'||c.bankVersion!==bank.version||c.rulesVersion!==bank.rulesVersion||c.copyVersion!==copy.copyVersion)errors.push('叙事配置版本不兼容');
 let blocks=[];try{blocks=slots(c);}catch{errors.push('四幕配置结构不完整');return {valid:false,ready:false,errors,missing};}
 const a=c.acts;if(Object.keys(a.prologue.options).sort().join(',')!=='Q1-A,Q1-B,Q1-C,Q1-D'||Object.keys(a.dynamics.dimensions).sort().join('')!=='ABCDEFGH'||Object.keys(a.meaning.paths).sort().join(',')!=='S1,S2,S3,S4'||Object.keys(a.ending).sort().join(',')!=='determined,insufficient,zero')errors.push('叙事选择分支不完整');
 const expected=[...Object.entries(a.prologue.options).map(([id,b])=>[b,{q1OptionId:id}]),[a.prologue.neutral,{q1Invalid:true}],...Object.entries(a.dynamics.dimensions).map(([id,b])=>[b,{dimensionId:id,coreMin:8}]),[a.dynamics.multipleOverview,{prototype:'multiple',coreMin:8}],[a.dynamics.undetermined,{coreMax:7}],...Object.entries(a.meaning.paths).map(([id,b])=>[b,{pathId:id}]),[a.meaning.dualBridge,{meaningKind:'dual'}],[a.meaning.singleClue,{meaningKind:'single-clue'}],[a.meaning.missing,{meaningKind:'missing'}],[a.ending.determined,{coreMin:8}],[a.ending.insufficient,{coreMin:1,coreMax:7}],[a.ending.zero,{coreMax:0}]];
 const canonical=o=>JSON.stringify(Object.entries(o||{}).sort(([a],[b])=>a.localeCompare(b)));for(const [b,rule] of expected)if(!b||canonical(b.appliesWhen)!==canonical(rule))errors.push('叙事块适用条件与分支不符：'+b?.id);
 const ids=new Set();for(const b of blocks){if(!b||typeof b.id!=='string'||ids.has(b.id)){errors.push('叙事块ID缺失或重复');continue;}ids.add(b.id);
 if(typeof b.approved!=='boolean'||!Array.isArray(b.paragraphs)||!Array.isArray(b.reflectionQuestions)||[...(Array.isArray(b.paragraphs)?b.paragraphs:[]),...(Array.isArray(b.reflectionQuestions)?b.reflectionQuestions:[])].some(t=>typeof t!=='string'||!t.trim())||!['answer-bound','metaphor','hypothetical','reflection'].includes(b.expressionMode)||!b.appliesWhen)errors.push('叙事块结构错误：'+b.id);
 if(b.title!==undefined&&(typeof b.title!=='string'||!b.title.trim()))errors.push('叙事标题错误：'+b.id);
 if(b.reflectionHeading!==undefined&&(typeof b.reflectionHeading!=='string'||!b.reflectionHeading.trim()||!b.reflectionQuestions.length))errors.push('反思问题标题错误：'+b.id);
 if(b.approved&&!b.paragraphs?.length)errors.push('已批准块不能缺少正文：'+b.id);
 if(!b.approved||!b.paragraphs?.length)missing.push(b.id);
 }
 return {valid:!errors.length,ready:!errors.length&&!missing.length,errors,missing};
}
function compile(bank,copy,c,input){const check=validate(bank,copy,c);if(!check.valid)throw Error(check.errors.join('；'));
 if(input.bankVersion!==bank.version||input.rulesVersion!==bank.rulesVersion)throw Error('叙事与答卷版本不一致');
 // Explicit allowlist: read only typed IDs/statuses; never access open-answer text.
 const choices=(input.choices||[]).map(e=>({questionId:e.questionId,optionId:e.optionId,status:e.status,layer:e.layer,contribution:e.contribution}));
 const actual=[];for(const e of choices){const q=bank.questions.find(q=>q.id===e.questionId&&q.type==='choice');const o=q?.options.find(o=>o.id===e.optionId);if(q&&o&&e.status==='answered'&&e.layer===q.layer&&e.contribution?.dimension===o.dimension&&e.contribution.points===1)actual.push({questionId:q.id,optionId:o.id,dimensionId:q.layer==='core'?o.dimension:null,pathId:q.layer==='special'?o.dimension:null});}
 if(actual.filter(e=>e.dimensionId).length!==input.coreAnswered)throw Error('核心覆盖与有效证据不一致');
 if(input.top.some(k=>!bank.dimensions[k]||!actual.some(e=>e.dimensionId===k)))throw Error('主导维度缺少实际有效证据');
 const q1=actual.find(e=>e.questionId==='Q1'),q1state=choices.find(e=>e.questionId==='Q1')?.status||'unanswered';
 const special=actual.filter(e=>['S-Q1','S-Q2'].includes(e.questionId));const paths=[...new Set(special.map(e=>e.pathId))].sort();const meaningKind=special.length===0?'missing':special.length===1?'single-clue':paths.length===1?'single':'dual';
 const a=c.acts;const take=(b,evidence,conditions)=>({blockId:b.id,...(b.title?{title:b.title,copyVersion:b.copyVersion,...(b.reflectionHeading?{reflectionHeading:b.reflectionHeading}:{})}:{}),paragraphs:b.approved?[...b.paragraphs]:[],reflectionQuestions:b.approved?[...b.reflectionQuestions]:[],expressionMode:b.expressionMode,matchedEvidence:evidence.map(e=>({...e})),appliesWhen:{...b.appliesWhen},conditions,fallback:!b.approved||!b.paragraphs.length,fallbackReason:!b.approved?'missing-approved-copy':!b.paragraphs.length?'missing-body':null});
 const acts=[];
 acts.push({id:'I',title:'序章',kind:q1?'q1-choice':'neutral',q1Status:q1state,blocks:[take(q1?a.prologue.options[q1.optionId]:a.prologue.neutral,q1?[q1]:[],{q1OptionId:q1?.optionId||null,q1Status:q1state})]});
 const kindMatches=input.prototype==='single'&&input.top.length===1||input.prototype==='dual'&&input.top.length===2||input.prototype==='multiple'&&input.top.length>=3;
 const determined=input.coreAnswered>=8&&kindMatches;
 const abnormal=input.coreAnswered>=8&&!determined;
 const diagnostics=abnormal?[{code:'inconsistent-core-prototype',coreAnswered:input.coreAnswered,prototype:input.prototype,dimensionIds:[...input.top]}]:[];
 const anomalyBlock=act=>({blockId:'STORY-'+act+'-STATE-ANOMALY',paragraphs:['当前结果状态与有效作答数量不一致，暂不生成确定动力结论。你的原始分数和作答记录已保留。'],reflectionQuestions:[],expressionMode:'answer-bound',matchedEvidence:[],appliesWhen:{coreMin:8,determined:false},conditions:diagnostics[0],fallback:true,fallbackReason:'inconsistent-core-prototype'});
 const dynamics={id:'II',title:'动力叙事',kind:abnormal?'anomaly':determined?input.prototype:'undetermined',dimensionIds:determined?[...input.top]:[],blocks:[],representativeEvidence:[]};
 if(determined){if(input.prototype==='multiple')dynamics.blocks.push(take(a.dynamics.multipleOverview,actual.filter(e=>input.top.includes(e.dimensionId)),{prototype:'multiple',coreAnswered:input.coreAnswered,dimensionIds:[...input.top]}));
 for(const k of input.top)dynamics.blocks.push(take(a.dynamics.dimensions[k],actual.filter(e=>e.dimensionId===k),{dimensionId:k,coreAnswered:input.coreAnswered}));
 // Round-robin across tied dimensions; maximum 3 real COPY-1.0 sentences globally.
 const candidates=input.drivers||[];for(let i=0;dynamics.representativeEvidence.length<3;i++){let added=false;for(const d of candidates){const s=d.evidenceSentences[i];if(!s)continue;const ids=s.optionIds.filter(id=>actual.some(e=>e.optionId===id&&e.dimensionId===d.dimensionId));if(!ids.length)continue;dynamics.representativeEvidence.push({id:s.id,text:s.text,optionIds:ids,dimensionId:d.dimensionId});added=true;if(dynamics.representativeEvidence.length===3)break;}if(!added)break;}
 }
 if(!determined)dynamics.blocks.push(abnormal?anomalyBlock('II'):take(a.dynamics.undetermined,actual.filter(e=>e.dimensionId),{coreAnswered:input.coreAnswered,prototype:input.prototype}));
 acts.push(dynamics);
 const meaning={id:'III',title:'特殊意义',kind:meaningKind,pathIds:paths,blocks:[]};
 if(meaningKind==='missing')meaning.blocks.push(take(a.meaning.missing,[],{meaningKind}));
 else if(meaningKind==='single-clue')meaning.blocks.push(take(a.meaning.singleClue,special,{meaningKind,pathIds:paths}));
 else {if(meaningKind==='dual')meaning.blocks.push(take(a.meaning.dualBridge,special,{meaningKind,pathIds:paths}));for(const k of paths)meaning.blocks.push(take(a.meaning.paths[k],special.filter(e=>e.pathId===k),{meaningKind,pathId:k}));}
 acts.push(meaning);
 const endingKind=input.coreAnswered===0?'zero':input.coreAnswered<8?'insufficient':determined?'determined':'anomaly';
 acts.push({id:'IV',title:'终章',kind:endingKind,blocks:[abnormal?anomalyBlock('IV'):take(a.ending[endingKind],actual.filter(e=>e.dimensionId),{coreAnswered:input.coreAnswered,prototype:input.prototype,dimensionIds:determined?[...input.top]:[]})]});
 return {narrativeVersion:c.narrativeVersion,stage:c.stage,copyReady:check.ready,missingCopy:check.missing,diagnostics,acts,special:{kind:meaningKind,pathIds:paths,evidence:special},selectionTrace:acts.flatMap(act=>act.blocks.map(b=>({actId:act.id,...b})))};
}
const api={validate,compile};if(typeof module==='object'&&module.exports)module.exports=api;else root.TAStoryV33=api;
})(typeof globalThis!=='undefined'?globalThis:this);
