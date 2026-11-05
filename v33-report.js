/* One content tree for the webpage, clipboard and downloadable report. */
(function(root){'use strict';
const N=typeof module==='object'&&module.exports?require('./narrative.js'):root.TANarrativeV33;
const S=typeof module==='object'&&module.exports?require('./story.js'):root.TAStoryV33;
const BM=typeof module==='object'&&module.exports?require('./benchmark.js'):root.TABenchmarkV33;
const statusNames={unanswered:'未作答',answered:'已作答',skipped:'主动跳过',not_applicable:'不适用'};
const node=(tag,content,attrs={})=>({tag,attrs,...(Array.isArray(content)?{children:content}:{text:String(content)})});
const p=text=>node('p',text),section=(title,children)=>node('section',[node('div',title,{class:'eyebrow'}),...children],{class:'paper'});
function createBase(bank,result,copy){
 if(result.bankVersion!==bank.version||result.rulesVersion!==bank.rulesVersion)throw Error('报告与题库版本不一致');
 // Only typed choice IDs and scoring evidence cross the interpretation boundary.
 // Open-answer text is retained exclusively in the archival evidence section below.
 const choiceEvidence=result.evidence.filter(e=>e.layer==='core'&&bank.questions.some(q=>q.id===e.questionId&&q.type==='choice')).map(e=>({questionId:e.questionId,layer:e.layer,status:e.status,optionId:e.optionId,contribution:e.contribution?{dimension:e.contribution.dimension,points:e.contribution.points}:null}));
 const confirmed=result.core.answered>=8&&(result.prototype==='single'&&result.top.length===1||result.prototype==='dual'&&result.top.length===2||result.prototype==='multiple'&&result.top.length>=3),abnormal=result.core.answered>=8&&!confirmed,safePrototype=confirmed?result.prototype:'undetermined';
 const drivers=N.interpret(bank,copy,{bankVersion:result.bankVersion,rulesVersion:result.rulesVersion,coreAnswered:result.core.answered,dimensionIds:confirmed?result.top:[],choiceEvidence});
 const names=ks=>ks.map(k=>bank.dimensions[k]).join(' ＋ '),kind={single:'主导动力',dual:'双动力',multiple:'多动力',undetermined:'暂未确定'};
 const tree=[];
 tree.push(node('section',[
 node('div','你的吸引动力手记 · V3.3',{class:'eyebrow'}),node('h1',safePrototype==='multiple'?'你的关注，有不止一种线索':drivers.length?names(result.top):'此刻的线索，还不足以定型。'),
 p(abnormal?'结果状态异常：有效作答数量与原型状态不一致，暂不生成确定结论。':kind[safePrototype]+(result.core.answered<8?'：核心有效作答少于8题。':'')),
 ...(drivers.length?[p('本次'+result.core.answered+'道有效核心选择中，'+result.top.map(k=>bank.dimensions[k]+'获得'+result.raw[k]+'分').join('，')+'。这些是本次答案呈现的倾向，不是对你或TA的定论。')]:[]),
 node('span','核心有效作答 '+result.core.answered+' / 12 · 原始总分 '+result.total,{class:'seal'})],{class:'resulthead'}));
 if(drivers.length)tree.push(section('COPY-1.0基础解释',drivers.map(d=>node('article',[
 node('div',d.name+' · '+result.raw[d.dimensionId]+'分',{class:'eyebrow'}),node('h2',d.shortTitle),
 ...d.coreExplanation.map(p),
 ...(d.evidenceSentences.length?[node('h3','你的选择留下的线索'),node('ul',d.evidenceSentences.map(s=>node('li',[
 p(s.text),node('small','证据 '+s.id+' · 对应选项 '+s.optionIds.join('、'))
 ],{'data-copy-evidence-id':s.id,'data-option-ids':s.optionIds.join(','),class:'copy-evidence'})),{class:'copy-evidence-list'})]:[]),
 node('div',[node('b','解释边界'),...d.boundaries.map(p)],{class:'try'})
 ],{class:'interpret','data-dimension':d.dimensionId}))));
 tree.push(section('01 ／ 八维原始分数',[
 ...Object.keys(bank.dimensions).map(k=>{const related=bank.questions.filter(q=>q.layer==='core'&&q.options.some(o=>o.dimension===k));const answered=related.filter(q=>result.evidence.some(e=>e.questionId===q.id&&e.status==='answered')).length;
 return node('div',[node('div',[node('span',bank.dimensions[k]),node('strong',result.raw[k]+' 分')]),node('p','相关题有效作答 '+answered+' / '+related.length,{class:'note left'})],{class:'score'});}),
 p('原始总分：'+result.total),p('零分表示本次未获得该维度分数，不代表完全缺乏这种动力。跳题和不适用不作负向判断。分数未归一化。'),
 ...(result.second.length?[p('次要动力：'+names(result.second))]:[])]));
 tree.push(section('02 ／ TA的特别意义',[
 node('h2',result.paths.length?result.paths.map(k=>bank.paths[k]).join(' ＋ '):'特殊性路径未确定'),
 p(result.specialResult==='single'?'前两题指向同一路径。':result.specialResult==='dual'?'前两题分别指向这两条路径。':'前两道特殊性题需均有效作答，才能判断单路径或双路径。'),
 p('开放题只保留你的描述，不参与自动计分。')]));
 tree.push(section('03 ／ 版本、覆盖与证据',[
 p('题库版本：'+result.bankVersion),p('规则版本：'+result.rulesVersion),p('文案版本：'+copy.copyVersion),
 p('TA类型：'+(result.context.kind||'未填写')),p('关注时长：'+(result.context.duration||'未填写')),
 ...[['核心题',result.core],['特殊性题（含开放题）',result.special]].map(([name,c])=>p(name+'：有效填写 '+c.answered+'/'+c.total+'；未作答 '+c.unanswered+'；主动跳过 '+c.skipped+'；不适用 '+c.not_applicable+'。')),
 p('证据来源：你在本题库中的自填答案。不判断关系类型，不推断TA的回应。'),
 node('details',[node('summary','查看作答证据／修改答案'),...result.evidence.map(e=>node('button',[
 node('span',[node('span',e.questionId+' · '+e.prompt),node('small',statusNames[e.status]+' · '+(e.optionId?e.optionId+' · ':'')+(e.openHidden?'开放回答已隐藏（公开分享视图）':e.optionText||e.text||'无作答证据')+(e.contribution?' → '+e.contribution.dimension+' +1':' · 不计分'))]),
 node('b','修改 ↗')],{class:'reviewitem','data-edit':e.questionId,type:'button'}))]),
 p('只记录此刻的你，不定义你与TA的关系。'),p('趣味自我探索 · 非科学诊断 · 答案仅保留在当前浏览器')
 ]));
 return {bankVersion:bank.version,rulesVersion:bank.rulesVersion,copyVersion:copy.copyVersion,drivers,tree};
}

function create(bank,result,copy,storyCopy,options={}){
 if(!storyCopy)return createBase(bank,result,copy);
 const view=options.view==='private'?'private':'public';
 // Public documents contain no open text, even in collapsed sections or serialized output.
 const safeResult={...result,evidence:result.evidence.map(e=>e.questionId==='S-Q3'&&view==='public'?{...e,text:null,openHidden:true}:{...e})};
 const base=createBase(bank,safeResult,copy);
 const choices=result.evidence.filter(e=>bank.questions.some(q=>q.id===e.questionId&&q.type==='choice')).map(e=>({questionId:e.questionId,optionId:e.optionId,status:e.status,layer:e.layer,contribution:e.contribution?{...e.contribution}:null}));
 const story=S.compile(bank,copy,storyCopy,{bankVersion:result.bankVersion,rulesVersion:result.rulesVersion,coreAnswered:result.core.answered,top:result.top,prototype:result.prototype,choices,drivers:base.drivers});
 const renderTrace=[];
 function paragraph(text,block,suffix,evidence=block.matchedEvidence,source='factual-fallback'){
  const segmentId=block.blockId+'-'+suffix;
  renderTrace.push({segmentId,blockId:block.blockId,text,source,matchedEvidence:evidence.map(e=>({...e})),appliesWhen:block.appliesWhen,conditions:block.conditions,fallback:block.fallback,fallbackReason:block.fallbackReason});
  return node('p',text,{'data-story-block-id':block.blockId,'data-story-segment-id':segmentId});
 }
 function approved(block){const body=block.paragraphs.map((text,i)=>paragraph(text,block,'p'+(i+1),block.matchedEvidence,'story-copy'));if(block.reflectionHeading){const heading=paragraph(block.reflectionHeading,block,'reflection-heading',block.matchedEvidence,'story-copy-question');heading.tag='h3';heading.attrs['data-story-reflection-heading']='true';body.push(heading);}return [...body,...block.reflectionQuestions.map((text,i)=>paragraph(text,block,'question'+(i+1),block.matchedEvidence,'story-copy-question'))];}
 function matchedText(e){const q=bank.questions.find(q=>q.id===e.questionId),o=q.options.find(o=>o.id===e.optionId);return e.optionId+'：'+o.text;}
 function evidenceList(sentences,block,answersOnly=false){return node('ul',sentences.map(s=>{
  const actual=choices.filter(e=>s.optionIds.includes(e.optionId)&&e.status==='answered').map(e=>({questionId:e.questionId,optionId:e.optionId,dimensionId:e.contribution.dimension,pathId:null}));
  return node('li',[paragraph(answersOnly?actual.map(matchedText).join('；'):s.text,block,'evidence-'+s.id,actual,answersOnly?'answer-option':'COPY-1.0-evidence'),node('small','证据 '+s.id+' · 对应选项 '+s.optionIds.join('、'))],{class:'story-evidence','data-copy-evidence-id':s.id,'data-option-ids':s.optionIds.join(',')});
 }),{class:'copy-evidence-list'});}
 let scenes=story.acts.map(act=>{
  const content=[];
  if(act.id==='I'){
   const b=act.blocks[0];if(!b.fallback&&b.title){const heading=paragraph(b.title,b,'title',b.matchedEvidence,'story-copy');heading.tag='h3';content.push(heading);}content.push(...approved(b));if(b.fallback){content.push(paragraph(b.matchedEvidence.length?'Q1实际选择：'+matchedText(b.matchedEvidence[0]):'Q1状态：'+statusNames[act.q1Status]+'。',b,'fact'));}
  }else if(act.id==='II'){
   if(act.kind==='undetermined'||act.kind==='anomaly'){
    const b=act.blocks[0];if(b.title){const heading=paragraph(b.title,b,'title',b.matchedEvidence,'story-copy');heading.tag='h3';content.push(heading);}content.push(...approved(b));
   }else{
    for(const b of act.blocks){
     if(b.conditions.prototype==='multiple'){
      if(!b.fallback&&b.title){const heading=paragraph(b.title,b,'title',b.matchedEvidence,'story-copy');heading.tag='h3';content.push(heading);}
      content.push(...approved(b));
      if(b.fallback){content.push(paragraph('多动力：'+act.dimensionIds.map(k=>bank.dimensions[k]+' '+result.raw[k]+'分').join(' ＋ ')+'。',b,'fact'));content.push(evidenceList(act.representativeEvidence,b,true));}
      continue;
     }
     const k=b.conditions.dimensionId,d=base.drivers.find(d=>d.dimensionId===k),body=[node('h2',d.name+' · '+result.raw[k]+'分')];
     if(!b.fallback&&b.title){const heading=paragraph(b.title,b,'title',b.matchedEvidence,'story-copy');heading.tag='h3';body.push(heading);}
     body.push(...approved(b));
     if(b.fallback){body.push(paragraph('本次有'+result.raw[k]+'项有效选择计入这一维度。以下列出其中的实际选项，完整基础解释可在详细分析中查看。',b,'answer-summary',b.matchedEvidence,'neutral-interface'));body.push(evidenceList(d.evidenceSentences,b,true));}
     content.push(node('article',body,{class:'story-driver','data-story-dimension':k}));
    }
   }
  }else if(act.id==='III'){
   for(const b of act.blocks){
    const body=[];
    if(b.conditions.pathId)body.push(node('h2',bank.paths[b.conditions.pathId]));
    if(!b.fallback&&b.title){const heading=paragraph(b.title,b,'title',b.matchedEvidence,'story-copy');heading.tag='h3';body.push(heading);}
    body.push(...approved(b));
    if(act.kind==='single-clue'){
     if(b.fallback)body.push(paragraph('单题线索：'+act.pathIds.map(k=>bank.paths[k]).join(' ＋ ')+'；特殊性路径尚未确定。',b,'fact'));
     body.push(...b.matchedEvidence.map((e,i)=>{const q=bank.questions.find(q=>q.id===e.questionId),o=q.options.find(o=>o.id===e.optionId);return paragraph(o.text,b,'source-'+i,[e],'answer-option');}));
    }else if(b.fallback){
     if(b.conditions.pathId)body.push(...b.matchedEvidence.map((e,i)=>paragraph(matchedText(e),b,'fact-'+i,[e])));
     else if(act.kind==='missing')body.push(paragraph('特殊性前两题均无有效答案，路径未确定。',b,'fact'));
    }
    if(b.conditions.pathId)content.push(node('article',body,{class:'story-driver','data-story-path':b.conditions.pathId}));else content.push(...body);
   }
  }else{
   const b=act.blocks[0];if(b.title){const heading=paragraph(b.title,b,'title',b.matchedEvidence,'story-copy');heading.tag='h3';content.push(heading);}content.push(...approved(b));
  }
  const scene=section(act.id+' ／ '+act.title,content);scene.attrs['data-story-act']=act.id;return scene;
 });
 const benchmark=options.benchmark?BM.select(bank,copy,options.benchmark,{bankVersion:result.bankVersion,rulesVersion:result.rulesVersion,coreAnswered:result.core.answered,top:result.top,prototype:result.prototype,raw:result.raw,choices}):{matched:false,reasons:['benchmark-not-enabled']};
 let displayStory=story,header=base.tree[0];
 if(benchmark.matched){
  renderTrace.length=0;
  scenes=benchmark.acts.map(act=>node('section',[node('h2',act.title),...act.segments.map((seg,i)=>{const n=paragraph(seg.text,act,String(i+1),act.matchedEvidence,benchmark.copyVersion);if(seg.kind==='heading')n.tag='h3';return n;})],{class:'paper benchmark-act','data-story-act':act.id,'data-benchmark-block-id':act.blockId}));
  header=node('section',[node('div','你的吸引动力手记 · NARRATIVE-1.1',{class:'eyebrow'}),node('h1',benchmark.title),node('p',benchmark.subtitle,{class:'lead benchmark-subtitle'}),node('span','核心有效作答 '+result.core.answered+' / 12 · 原始总分 '+result.total,{class:'seal'})],{class:'resulthead benchmark-head'});
  displayStory={...story,narrativeVersion:benchmark.narrativeVersion,copyReady:true,missingCopy:[],compatibleBranchMissing:story.missingCopy,benchmarkVersion:benchmark.copyVersion,acts:benchmark.acts.map(a=>({id:a.id,title:a.title,kind:'benchmark',blocks:[a]})),selectionTrace:benchmark.acts.map(a=>({actId:a.id,blockId:a.blockId,matchedEvidence:a.matchedEvidence,appliesWhen:a.appliesWhen,conditions:a.conditions,fallback:false,fallbackReason:null}))};
 }
 const privacy=view==='private'?'私人报告：复制或下载可能包含你的开放回答，请确认后再分享。':'公开分享视图：开放回答默认隐藏。';
 const details=node('details',[node('summary','详细分析：分数、COPY-1.0解释、证据与版本'),...base.tree.slice(1),p('叙事版本：'+displayStory.narrativeVersion+(benchmark.matched?'':' Beta')),...(benchmark.matched?[p('标杆文案版本：'+benchmark.copyVersion)]:[]),p('视图：'+(view==='private'?'私人':'公开分享')),
 node('details',[node('summary','查看段落依据'),...renderTrace.map(t=>p(t.segmentId+' | '+(t.source.startsWith('COPY-1.0')?'COPY-1.0基础解释':t.source==='answer-option'?'原始选项':t.source===benchmark.copyVersion?'标杆正式文案':'作答说明')+' | '+(t.fallback?'依据作答事实展示':'已匹配正式文案')+' | '+t.matchedEvidence.map(e=>e.optionId).join('、')+' | 条件：'+JSON.stringify(t.conditions)))])],{id:'analysis-details',class:'paper analysis-details'});
 // Presentation-only editorial layout. Keep every original narrative leaf and trace.
 const originalHeader=header.children;
 if(!benchmark.matched&&result.prototype==='dual')originalHeader[1].attrs['data-title-wrap']='dimensions';
 const cover=node('section',[
  node('div','',{class:'editorial-imprint','aria-hidden':'true'}),
  originalHeader[1],
  benchmark.matched?originalHeader[2]:node('div','',{class:'editorial-subtitle-space','aria-hidden':'true'}),
  node('span','',{class:'editorial-reading-cue','aria-hidden':'true'})
 ],{class:(header.attrs.class||'resulthead')+' editorial-cover','data-prototype':result.prototype});
 const certainty=benchmark.matched?node('p',base.tree[0].children[2].text,{class:'coverage-certainty'}):originalHeader[2];
 const coverage=node('aside',[certainty,originalHeader[originalHeader.length-1]],{id:'report-coverage',class:'report-coverage'+(result.core.answered<8?' is-limited':''),'aria-label':'作答覆盖与结果确定性',role:'note'});
 // Version and the previous numerical summary stay available in full analysis.
 details.children.splice(1,0,originalHeader[0],...(!benchmark.matched&&originalHeader.length>4?[originalHeader[3]]:[]));
 for(const scene of scenes){scene.attrs.class+=' editorial-chapter';if(scene.attrs['data-story-act']==='IV'){
  const titleIndex=scene.children.findIndex(n=>n.attrs?.['data-story-reflection-heading']==='true'||scene.attrs['data-benchmark-block-id']&&n.tag==='h3');
  if(titleIndex>=0){scene.children[titleIndex].attrs.class='editorial-postscript-title';for(const n of scene.children.slice(titleIndex+1))n.attrs.class=(n.attrs.class||'')+' editorial-postscript';}
 }}
 return {...base,narrativeVersion:displayStory.narrativeVersion,benchmarkVersion:benchmark.matched?benchmark.copyVersion:null,view,story:{...displayStory,benchmarkSelection:benchmark,renderTrace},tree:[cover,coverage,...scenes,node('p',privacy,{class:'note report-privacy'}),details]};
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toHTML(doc){const render=n=>'<'+n.tag+Object.entries(n.attrs||{}).map(([k,v])=>' '+k+'="'+escapeHTML(v)+'"').join('')+'>'+(n.text!==undefined?(n.attrs?.['data-title-wrap']==='dimensions'?n.text.split(' ＋ ').map((part,i)=>'<span class="title-dimension">'+escapeHTML((i?' ＋ ':'')+part)+'</span>').join(''):escapeHTML(n.text)):(n.children||[]).map(render).join(''))+'</'+n.tag+'>';return doc.tree.map(render).join('');}
function toText(doc){const visit=n=>n.text!==undefined?n.text:(n.children||[]).map(visit).join('\n');return doc.tree.map(visit).join('\n\n');}
const api={create,toHTML,toText};if(typeof module==='object'&&module.exports)module.exports=api;else root.TAReportV33=api;
})(typeof globalThis!=='undefined'?globalThis:this);
