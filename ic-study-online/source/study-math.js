/* Native MathML keeps equations selectable and works without a CDN or runtime fetch.
 * This is a display layer: source strings and canonical answer indices never change.
 * Only fully parsed mathematical expressions are typeset; prose stays plain text.
 */
function studyMathEscape(value) {
 return String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}
function studyMathTree(original) {
 const superscripts={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','⁻':'-','⁺':'+','ⁿ':'n'};
 const subscripts={'₀':'0','₁':'1','₂':'2','₃':'3','₄':'4','₅':'5','₆':'6','₇':'7','₈':'8','₉':'9'};
 let input=original.trim()
  .replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')
  .replace(/[−–]/g,'-')
  .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ]+/g,text=>'^('+[...text].map(c=>superscripts[c]).join('')+')')
  .replace(/[₀₁₂₃₄₅₆₇₈₉]+/g,text=>'_('+[...text].map(c=>subscripts[c]).join('')+')')
  .replace(/\bsum from\s+([A-Za-z])\s*=\s*(.*?)\s+to\s+(.*?)\s+of\s*/gi,(_,index,low,high)=>`Σ[${index}=${low}..${high}]`)
  .replace(/\bintegral from\s+(.*?)\s+to\s+(.*?)\s+of\s*/gi,(_,low,high)=>`∫[${low}..${high}]`)
  .replace(/e\^([+-]?j[ωπ][A-Za-z0-9]*)/g,'e^($1)')
  .replace(/_([A-Za-z][A-Za-z0-9]*)/g,'_($1)')
  .replace(/\^([A-Za-z]{2,})/g,'^($1)');
 // A bare numerical denominator followed by a variable is ambiguous (1/2π).
 // Preserve the original rather than silently choosing an interpretation.
 if (/\/\s*\d+(?:\.\d+)?\s*[A-Za-zα-ωΑ-Ω]/.test(input)) return null;
 const words=input.match(/[A-Za-z]{3,}/g)||[];
 if(words.some(word=>!['exp','sin','cos','tan','log','sqrt','min','max','abs','Sxx','Syy'].includes(word)))return null;
 const tokens=[];
 for(let rest=input;rest.length;){
  const whitespace=rest.match(/^\s+/);if(whitespace){rest=rest.slice(whitespace[0].length);continue;}
  const limits=rest.match(/^([Σ∑∫])\[([^\]]+)\]/);
  if(limits){const bounds=limits[2].split('..');if(bounds.length!==2)return null;tokens.push({kind:'limits',symbol:limits[1]==='∑'?'Σ':limits[1],low:bounds[0],high:bounds[1]});rest=rest.slice(limits[0].length);continue;}
  const number=rest.match(/^\d+(?:\.\d+)?/);
  if(number){tokens.push({kind:'number',text:number[0]});rest=rest.slice(number[0].length);continue;}
  const fn=rest.match(/^(exp|sin|cos|tan|log|sqrt|min|max|abs)(?=[(_])/);
  if(fn){tokens.push({kind:'function',text:fn[0]});rest=rest.slice(fn[0].length);continue;}
  if(/^[A-Za-zα-ωΑ-Ω]/.test(rest)){tokens.push({kind:'variable',text:rest[0]});rest=rest.slice(1);continue;}
  const symbol=rest.match(/^(<=|>=|!=|[+\-*/·×=<>≤≥≠≈±→↔^_()[\]{},|√∞])/);
  if(!symbol)return null;
  tokens.push({kind:'symbol',text:symbol[0]});rest=rest.slice(symbol[0].length);
 }
 let position=0;
 const peek=()=>tokens[position]?.text;
 const startsAtom=token=>token&&(token.kind==='number'||token.kind==='variable'||token.kind==='function'||token.kind==='limits'||['(','[','{','√','∞'].includes(token.text));
 function group(open){
  const close={'(':')','[':']','{':'}','|':'|'}[open];
  const value=expression(0,close);
  if(peek()!==close)throw Error('Unbalanced math group');position++;
  return {kind:'group',open,close,value};
 }
 function atom(){
  const token=tokens[position++];if(!token)throw Error('Missing math atom');
  if(token.kind==='number'||token.kind==='variable')return token;
  if(token.kind==='limits'){
   const low=studyMathTree(token.low),high=studyMathTree(token.high);
   if(!low||!high)throw Error('Invalid limits');
   return {...token,low,high};
  }
  if(token.kind==='function')return token;
  if(['(','[','{','|'].includes(token.text))return group(token.text);
  if(['-','+','±'].includes(token.text))return {kind:'unary',operator:token.text,value:expression(35)};
  if(token.text==='√')return {kind:'sqrt',value:expression(40)};
  if(token.text==='∞')return {kind:'infinity'};
  throw Error('Unsupported math atom');
 }
 function expression(minimum=0,stop){
  let left=atom();
  while(position<tokens.length){
   const next=tokens[position],operator=next.text;
   if(operator===stop||[')',']','}'].includes(operator))break;
   if(operator==='^'||operator==='_'){
    if(40<minimum)break;position++;
    const value=atom();
    left={kind:operator==='^'?'power':'subscript',base:left,value};continue;
   }
   if(operator==='('&&(left.kind==='variable'||left.kind==='function'||left.kind==='subscript')){
    if(45<minimum)break;position++;
    const argument=group('(');
    left={kind:'call',base:left,argument};continue;
   }
   const implicit=startsAtom(next)||operator==='|'&&stop!=='|';
   const precedence=implicit?30:({',':2,'=':5,'<':5,'>':5,'<=':5,'>=':5,'≤':5,'≥':5,'≠':5,'!=':5,'≈':5,'→':5,'↔':5,'+':10,'-':10,'±':10,'*':20,'·':20,'×':20,'/':20}[operator]);
   if(precedence===undefined||precedence<minimum)break;
   if(!implicit)position++;
   const right=expression(precedence+1,stop);
   left={kind:'binary',operator:implicit?'':operator,left,right};
  }
  return left;
 }
 try{if(!tokens.length)return null;const tree=expression();return position===tokens.length?tree:null;}catch{return null;}
}
function studyMathML(tree,unwrap=false) {
 const row=body=>`<mrow>${body}</mrow>`;
 const op=text=>`<mo>${studyMathEscape(text)}</mo>`;
 const clean=node=>studyMathML(node,true);
 switch(tree.kind){
  case 'number':return `<mn>${tree.text}</mn>`;
  case 'variable':return `<mi>${studyMathEscape(tree.text)}</mi>`;
  case 'function':return `<mi mathvariant="normal">${tree.text}</mi>`;
  case 'infinity':return op('∞');
  case 'group':return unwrap&&tree.open!=='|'?clean(tree.value):row(op(tree.open)+studyMathML(tree.value)+op(tree.close));
  case 'unary':return row(op(tree.operator==='-'?'−':tree.operator)+studyMathML(tree.value));
  case 'sqrt':return `<msqrt>${clean(tree.value)}</msqrt>`;
  case 'power':return tree.base.kind==='subscript'?`<msubsup>${studyMathML(tree.base.base)}${clean(tree.base.value)}${clean(tree.value)}</msubsup>`:`<msup>${studyMathML(tree.base)}${clean(tree.value)}</msup>`;
  case 'subscript':return tree.base.kind==='power'?`<msubsup>${studyMathML(tree.base.base)}${clean(tree.value)}${clean(tree.base.value)}</msubsup>`:`<msub>${studyMathML(tree.base)}${clean(tree.value)}</msub>`;
  case 'limits':return `<munderover><mo largeop="true" movablelimits="false">${tree.symbol==='Σ'?'∑':'∫'}</mo>${clean(tree.low)}${clean(tree.high)}</munderover>`;
  case 'call':
   if(tree.base.kind==='function'&&tree.base.text==='exp')return `<msup><mi>e</mi>${clean(tree.argument)}</msup>`;
   if(tree.base.kind==='function'&&tree.base.text==='sqrt')return `<msqrt>${clean(tree.argument)}</msqrt>`;
   if(tree.base.kind==='function'&&tree.base.text==='abs')return row(op('|')+clean(tree.argument)+op('|'));
   return row(studyMathML(tree.base)+studyMathML(tree.argument));
  case 'binary':
   if(tree.operator==='/')return `<mfrac>${clean(tree.left)}${clean(tree.right)}</mfrac>`;
   return row(studyMathML(tree.left)+(tree.operator?op({'-':'−','<=':'≤','>=':'≥','!=':'≠'}[tree.operator]||tree.operator):'<mo>⁢</mo>')+studyMathML(tree.right));
  default:throw Error('Unsupported math tree');
 }
}
function studyMathContent(text) {
 const original=String(text);
 if(!/[Σ∑∫^/²³⁴⁵⁻√]|\bexp\(|\bsum from\b|\bintegral from\b/i.test(original))return studyMathEscape(original);
 // A missing ROC in the source must remain visibly missing.
 const roc=original.match(/^(.*?)(,\s*ROC:.*)$/);
 const formula=roc?roc[1]:original;
 const tree=studyMathTree(formula);
 if(!tree)return studyMathEscape(original);
 return `<span class="study-formula"><math xmlns="http://www.w3.org/1998/Math/MathML" display="inline" displaystyle="true" aria-label="${studyMathEscape(formula)}"><semantics>${studyMathML(tree)}<annotation encoding="text/plain">${studyMathEscape(formula)}</annotation></semantics></math>${roc?`<span class="math-source-tail">${studyMathEscape(roc[2])}</span>`:''}</span>`;
}
function renderStudyMath(text) {
 return studyMathContent(text);
}
