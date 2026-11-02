/* One content tree for the webpage, clipboard and downloadable report. */
(function(root){'use strict';
const N=typeof module==='object'&&module.exports?require('./narrative.js'):root.TANarrativeV33;
const statusNames={unanswered:'未作答',answered:'已作答',skipped:'主动跳过',not_applicable:'不适用'};
const node=(tag,content,attrs={})=>({tag,attrs,...(Array.isArray(content)?{children:content}:{text:String(content)})});
const p=text=>node('p',text),section=(title,children)=>node('section',[node('div',title,{class:'eyebrow'}),...children],{class:'paper'});
function create(bank,result,copy){
 if(result.bankVersion!==bank.version||result.rulesVersion!==bank.rulesVersion)throw Error('报告与题库版本不一致');
 // Only typed choice IDs and scoring evidence cross the interpretation boundary.
 // Open-answer text is retained exclusively in the archival evidence section below.
 const choiceEvidence=result.evidence.filter(e=>e.layer==='core'&&bank.questions.some(q=>q.id===e.questionId&&q.type==='choice')).map(e=>({questionId:e.questionId,layer:e.layer,status:e.status,optionId:e.optionId,contribution:e.contribution?{dimension:e.contribution.dimension,points:e.contribution.points}:null}));
 const drivers=N.interpret(bank,copy,{bankVersion:result.bankVersion,rulesVersion:result.rulesVersion,coreAnswered:result.core.answered,dimensionIds:result.top,choiceEvidence});
 const names=ks=>ks.map(k=>bank.dimensions[k]).join(' ＋ '),kind={single:'主导动力',dual:'双动力',multiple:'多动力',undetermined:'暂未确定'};
 const tree=[];
 tree.push(node('section',[
 node('div','你的吸引动力手记 · V3.3',{class:'eyebrow'}),node('h1',drivers.length?names(result.top):'此刻的线索，还不足以定型。'),
 p(kind[result.prototype]+(result.core.answered<8?'：核心有效作答少于8题。':'')),
 ...(drivers.length?[p('本次'+result.core.answered+'道有效核心选择中，'+result.top.map(k=>bank.dimensions[k]+'获得'+result.raw[k]+'分').join('，')+'。这些是本次答案呈现的倾向，不是对你或TA的定论。')]:[]),
 node('span','核心有效作答 '+result.core.answered+' / 12 · 原始总分 '+result.total,{class:'seal'})],{class:'resulthead'}));
 if(drivers.length)tree.push(section('主导动力解读',drivers.map(d=>node('article',[
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
 node('span',[node('span',e.questionId+' · '+e.prompt),node('small',statusNames[e.status]+' · '+(e.optionId?e.optionId+' · ':'')+(e.optionText||e.text||'无作答证据')+(e.contribution?' → '+e.contribution.dimension+' +1':' · 不计分'))]),
 node('b','修改 ↗')],{class:'reviewitem','data-edit':e.questionId,type:'button'}))]),
 p('只记录此刻的你，不定义你与TA的关系。'),p('趣味自我探索 · 非科学诊断 · 答案仅保留在当前浏览器')
 ]));
 return {bankVersion:bank.version,rulesVersion:bank.rulesVersion,copyVersion:copy.copyVersion,drivers,tree};
}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function toHTML(doc){const render=n=>'<'+n.tag+Object.entries(n.attrs||{}).map(([k,v])=>' '+k+'="'+escapeHTML(v)+'"').join('')+'>'+(n.text!==undefined?escapeHTML(n.text):(n.children||[]).map(render).join(''))+'</'+n.tag+'>';return doc.tree.map(render).join('');}
function toText(doc){const visit=n=>n.text!==undefined?n.text:(n.children||[]).map(visit).join('\n');return doc.tree.map(visit).join('\n\n');}
const api={create,toHTML,toText};if(typeof module==='object'&&module.exports)module.exports=api;else root.TAReportV33=api;
})(typeof globalThis!=='undefined'?globalThis:this);
