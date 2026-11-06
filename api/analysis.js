/*PURE_START*/
function ema(arr,p){const k=2/(p+1),out=new Array(arr.length).fill(null);let prev=null;for(let i=0;i<arr.length;i++){if(i<p-1)continue;if(prev===null){let s=0;for(let j=i-p+1;j<=i;j++)s+=arr[j];prev=s/p}else prev=arr[i]*k+prev*(1-k);out[i]=prev}return out}
function sma(arr,p){const out=new Array(arr.length).fill(null);let s=0;for(let i=0;i<arr.length;i++){s+=arr[i];if(i>=p)s-=arr[i-p];if(i>=p-1)out[i]=s/p}return out}
function bbands(arr,p,m){const mid=sma(arr,p),up=new Array(arr.length).fill(null),lo=new Array(arr.length).fill(null);for(let i=p-1;i<arr.length;i++){let v=0;for(let j=i-p+1;j<=i;j++)v+=(arr[j]-mid[i])**2;const sd=Math.sqrt(v/p);up[i]=mid[i]+m*sd;lo[i]=mid[i]-m*sd}return{mid,up,lo}}
function atr(c,p){const out=new Array(c.length).fill(null);const tr=c.map((x,i)=>i===0?x.high-x.low:Math.max(x.high-x.low,Math.abs(x.high-c[i-1].close),Math.abs(x.low-c[i-1].close)));let prev=null;for(let i=0;i<c.length;i++){if(i<p-1)continue;if(prev===null){let s=0;for(let j=i-p+1;j<=i;j++)s+=tr[j];prev=s/p}else prev=(prev*(p-1)+tr[i])/p;out[i]=prev}return out}
function rsi(arr,p){const out=new Array(arr.length).fill(null);if(arr.length<=p)return out;let g=0,l=0;for(let i=1;i<=p;i++){const d=arr[i]-arr[i-1];if(d>=0)g+=d;else l-=d}g/=p;l/=p;out[p]=l===0?100:100-100/(1+g/l);for(let i=p+1;i<arr.length;i++){const d=arr[i]-arr[i-1];g=(g*(p-1)+(d>0?d:0))/p;l=(l*(p-1)+(d<0?-d:0))/p;out[i]=l===0?100:100-100/(1+g/l)}return out}
function findZonesDeep(c,live,A,maxN,liveC){
  const n=c.length,tol=Math.min(Math.max(0.6*A,live*0.004),live*0.03);
  // 1) pivotes a dos escalas (movimientos chicos y grandes); el mínimo/máximo reciente también cuenta
  const pv=new Map();
  const add=(t,i,p,w)=>{const key=t+i,o=pv.get(key);if(!o)pv.set(key,{t,p,i,w});else if(w>o.w)o.w=w};
  for(const [k,w] of [[3,1],[8,2]]){
    for(let i=k;i<n;i++){
      const r=Math.min(k,n-1-i);
      if(r<1&&i!==n-1)continue;
      let hi=true,lo=true;
      for(let j=i-k;j<=i+r;j++){
        if(j===i)continue;
        if(j<i){if(c[j].high>c[i].high)hi=false;if(c[j].low<c[i].low)lo=false}
        else{if(c[j].high>=c[i].high)hi=false;if(c[j].low<=c[i].low)lo=false}
      }
      const ww=r<k?1:w;
      if(hi)add('h',i,c[i].high,ww);
      if(lo)add('l',i,c[i].low,ww);
    }
  }
  if(liveC&&liveC.low!=null){
    let mn=Infinity,mx=-Infinity;
    for(let j=Math.max(0,n-8);j<n;j++){mn=Math.min(mn,c[j].low);mx=Math.max(mx,c[j].high)}
    if(liveC.low<mn)add('l',n,liveC.low,1);
    if(liveC.high>mx)add('h',n,liveC.high,1);
  }
  // un mismo movimiento no cuenta dos veces: pivotes del mismo tipo a menos de 3 velas se funden
  const ded=[];
  for(const t of ['h','l']){
    let prev=null;
    for(const q of [...pv.values()].filter(x=>x.t===t).sort((a,b)=>a.i-b.i)){
      if(prev&&q.i-prev.i<=3){
        if((t==='h'&&q.p>prev.p)||(t==='l'&&q.p<prev.p)){prev.p=q.p;prev.i=q.i}
        prev.w=Math.max(prev.w,q.w);
      }else{prev={...q};ded.push(prev)}
    }
  }
  ded.sort((a,b)=>a.p-b.p);
  const cl=[];
  for(const v of ded){const l=cl[cl.length-1];if(l&&v.p-l.sum/l.pts.length<=tol){l.pts.push(v);l.sum+=v.p}else cl.push({pts:[v],sum:v.p})}
  // 2) nodos de volumen: precios donde se operó mucho en las últimas velas
  const nodes=[];
  if(c.some(x=>x.volume>0)){
    const m=Math.min(n,300),lo0=live*0.5,hi0=live*1.5,bw=tol;
    const nb=Math.max(1,Math.ceil((hi0-lo0)/bw)),bins=new Array(nb).fill(0);
    for(let j=n-m;j<n;j++){const x=c[j],tp=(x.high+x.low+x.close)/3;if(tp<lo0||tp>=hi0)continue;bins[Math.floor((tp-lo0)/bw)]+=x.volume||0}
    const nz=bins.filter(v=>v>0),avg=nz.length?nz.reduce((a,b)=>a+b,0)/nz.length:0;
    for(let b=0;b<nb;b++){
      const v=bins[b];if(!avg||v<1.5*avg)continue;
      if((b>0&&bins[b-1]>v)||(b<nb-1&&bins[b+1]>v))continue;
      nodes.push({level:lo0+(b+0.5)*bw,ratio:v/avg});
    }
  }
  // 3) armar zonas: fuerza = rebotes (los grandes valen doble) + cercanía en el tiempo + volumen + número redondo
  const rstep=Math.pow(10,Math.floor(Math.log10(live)))/2;
  const zones=cl.map(z=>{
    const level=z.sum/z.pts.length,touches=z.pts.length,last=Math.max(...z.pts.map(p=>p.i));
    let strength=z.pts.reduce((s,p)=>s+p.w,0)+2*(last/n);
    const vn=nodes.find(o=>Math.abs(o.level-level)<=tol);
    const round=Math.abs(level-Math.round(level/rstep)*rstep)<=tol*0.5;
    if(vn)strength+=Math.min(3,vn.ratio-0.5);
    if(round)strength+=1;
    return{level,touches,last,strength,vol:!!vn,round};
  });
  for(const o of nodes){
    if(o.ratio>=2.2&&!zones.some(z=>Math.abs(z.level-o.level)<=tol))zones.push({level:o.level,touches:1,last:0,strength:Math.min(5,o.ratio),vol:true,round:false});
  }
  const good=zones.filter(z=>z.touches>=2||z.vol);
  good.forEach(z=>{z.stars=z.strength>=8?3:z.strength>=5?2:1});
  // 4) elegir las mejores por fuerza y cercanía al precio, sin amontonarlas
  const pick=arr=>{
    arr.forEach(z=>{z.rank=z.strength/(1+Math.abs(live-z.level)/live*10)});
    arr.sort((a,b)=>b.rank-a.rank);
    const out=[];
    for(const z of arr){if(out.length>=maxN)break;if(out.every(o=>Math.abs(o.level-z.level)>0.6*tol))out.push(z)}
    return out;
  };
  return{sup:pick(good.filter(z=>z.level<live&&z.level>=live*0.5)),res:pick(good.filter(z=>z.level>=live&&z.level<=live*1.5))};
}
function zoneAnalysis(closed,live,P,liveC){
  const n=closed.length;if(n<60)return null;
  const close=closed.map(x=>x.close),A=atr(closed,P.atr)[n-1];
  if(!A)return null;
  const z=findZonesDeep(closed,live,A,P.zonesN||6,liveC);
  const bb=bbands(close,P.bbLen,P.bbMult),up=bb.up[n-1],lo=bb.lo[n-1];
  const rs=rsi(close,14)[n-1];
  let hh=0;for(let j=Math.max(0,n-250);j<n;j++)hh=Math.max(hh,closed[j].high);
  const cl=x=>Math.max(0,Math.min(1,x));
  const pb=(up!=null&&lo!=null&&up>lo)?(live-lo)/(up-lo):0.5;
  const dd=(hh-live)/hh*100,ratio=live/hh,rr=rs==null?50:rs;
  let nb=null,ns=null;
  for(const q of [...z.sup,...z.res]){
    if(q.level<=live+0.5*A&&(!nb||q.level>nb.level))nb=q;
    if(q.level>=live-0.5*A&&(!ns||q.level<ns.level))ns=q;
  }
  const zs=(q,d)=>q?25*cl(1-Math.max(0,d)/(4*A))*Math.min(1,(q.strength+3)/8):0;
  const buy=Math.round(zs(nb,nb?live-nb.level:0)+25*cl((0.25-pb)/0.25)+25*cl(dd/40)+25*cl((45-rr)/15));
  const sell=Math.round(zs(ns,ns?ns.level-live:0)+25*cl((pb-0.75)/0.25)+25*cl((ratio-0.85)/0.15)+25*cl((rr-55)/15));
  let zone='neutral';
  if(buy>=P.minScore&&buy>sell)zone='buy';else if(sell>=P.minScore&&sell>buy)zone='sell';
  return{z,buy,sell,zone,rsi:rr,pb,dd,nb,ns,hh};
}
function calcSignals(c,P){
  const n=c.length,close=c.map(x=>x.close);
  const f=ema(close,P.fast),s=ema(close,P.slow),a=atr(c,P.atr);
  const ev=[];let act=null,pend=null;
  for(let i=1;i<n;i++){
    if(f[i-1]==null||s[i-1]==null||f[i]==null||s[i]==null||a[i]==null)continue;
    const up=f[i-1]<=s[i-1]&&f[i]>s[i],dn=f[i-1]>=s[i-1]&&f[i]<s[i],x=c[i];
    if(act){
      if(act.side==='BUY'){
        if(x.low<=act.sl){ev.push({i,time:x.time,type:'SL',side:'BUY',price:act.sl});act=null}
        else if(x.high>=act.tp){ev.push({i,time:x.time,type:'TP',side:'BUY',price:act.tp});act=null}
      }else{
        if(x.high>=act.sl){ev.push({i,time:x.time,type:'SL',side:'SELL',price:act.sl});act=null}
        else if(x.low<=act.tp){ev.push({i,time:x.time,type:'TP',side:'SELL',price:act.tp});act=null}
      }
    }
    if(act&&((act.side==='BUY'&&dn)||(act.side==='SELL'&&up))){ev.push({i,time:x.time,type:'INV',side:act.side,price:x.close});act=null}
    if(up)pend={side:'BUY',i};else if(dn)pend={side:'SELL',i};
    if(pend){
      if(pend.side==='BUY'&&f[i]<=s[i])pend=null;
      else if(pend.side==='SELL'&&f[i]>=s[i])pend=null;
      else if(i-pend.i>2)pend=null;
    }
    if(pend&&!act){
      const ok=!P.confirm||(pend.side==='BUY'?x.close>x.open:x.close<x.open);
      if(ok){
        let lo=Infinity,hi=-Infinity;
        for(let j=Math.max(0,i-P.swing+1);j<=i;j++){lo=Math.min(lo,c[j].low);hi=Math.max(hi,c[j].high)}
        const side=pend.side,entry=x.close;
        const sl=side==='BUY'?lo-P.slm*a[i]:hi+P.slm*a[i];
        const risk=Math.abs(entry-sl);
        if(risk>0){
          const tp=side==='BUY'?entry+P.rr*risk:entry-P.rr*risk;
          act={side,i,time:x.time,entry,sl,tp,risk};
          ev.push({i,time:x.time,type:side,side,price:entry});
        }
        pend=null;
      }
    }
  }
  return{ev,act,f,s,a};
}
function analyze(candles,P){
  if(!candles||candles.length<60)return{state:'none',score:0,label:'Sin datos suficientes'};
  const closed=candles.slice(0,-1),live=candles[candles.length-1].close,r=calcSignals(closed,P),n=closed.length,i=n-1;
  const act=r.act;let bars=null,dist=null,side=null,imminent=null;
  if(act){bars=i-act.i;dist=(live-act.entry)/act.entry*100;side=act.side}
  if(r.f[i]!=null&&r.s[i]!=null&&r.f[i-1]!=null&&r.s[i-1]!=null&&r.a[i]!=null){
    const gap=r.f[i]-r.s[i],pgap=r.f[i-1]-r.s[i-1];
    if(Math.abs(gap)<0.35*r.a[i]&&Math.abs(gap)<Math.abs(pgap))imminent=gap<0?'BUY':'SELL';
  }
  let state='none',score=0,label='Sin señal';
  if(act&&bars<=3){state='new';score=100-bars;label=(side==='BUY'?'COMPRA':'VENTA')+' nueva'}
  else if(act&&Math.abs(dist)<=P.prox){state='near';score=80;label='Cerca de zona de '+(side==='BUY'?'compra':'venta')}
  else if(imminent){state='soon';score=60;label='Cruce '+(imminent==='BUY'?'alcista':'bajista')+' cerca'}
  else if(act){state='run';score=30;label=(side==='BUY'?'Compra':'Venta')+' en curso'}
  const Z=zoneAnalysis(closed,live,P,candles[candles.length-1]);const St=Z?stageOf(closed,live,Z):{stage:'none'};
  return{state,score,label,act,side,bars,dist,imminent,live,lastTime:closed[i].time,r,closed,Z,St};
}
function stageOf(closed,live,Z){
  const n=closed.length,A=atr(closed,14)[n-1];
  if(!A||n<30)return{stage:'none'};
  const L=closed.slice(-5),avg=closed.slice(-25,-5).reduce((s,x)=>s+x.volume,0)/20,vr=avg?L.reduce((s,x)=>s+x.volume,0)/5/avg:1;
  const cl=x=>Math.max(0,Math.min(1,x)),body=L.reduce((s,x)=>s+Math.abs(x.close-x.open),0)/5/A;
  const sc=(k,mv)=>Math.round(40*k/5+30*cl(body/0.8)+15*cl((vr-1)/0.8)+15*cl(mv/3));
  const bear=sc(L.filter(x=>x.close<x.open).length,(closed[n-6].close-live)/A),bull=sc(L.filter(x=>x.close>x.open).length,(live-closed[n-6].close)/A);
  const all=[...Z.z.sup,...Z.z.res],L10=closed.slice(-10),mx=Math.max(...L10.map(x=>x.close)),mn=Math.min(...L10.map(x=>x.close));
  const bd=all.filter(q=>q.level-live>=0.25*A&&mx>=q.level).sort((a,b)=>a.level-b.level)[0];
  const bu=all.filter(q=>live-q.level>=0.25*A&&mn<=q.level).sort((a,b)=>b.level-a.level)[0];
  const sup=Z.z.sup.filter(q=>q.level<live).sort((a,b)=>b.level-a.level)[0],res=Z.z.res.filter(q=>q.level>live).sort((a,b)=>a.level-b.level)[0];
  let stage='none',ref=null,tgt=null;
  if(Z.zone==='buy'){stage='buy-in';ref=Z.nb}
  else if(Z.zone==='sell'){stage='sell-in';ref=Z.ns}
  else{const ds=sup?live-sup.level:1e9,dr=res?res.level-live:1e9;if(Math.min(ds,dr)<=1.5*A){if(ds<=dr){stage='buy-near';ref=sup}else{stage='sell-near';ref=res}}}
  if(bear>=60&&(bd||/^buy/.test(stage))){stage='breakdown';ref=bd||null;tgt=sup}
  else if(bull>=60&&(bu||/^sell/.test(stage))){stage='breakup';ref=bu||null;tgt=res}
  return{stage,bear,bull,ref,tgt,A,vr};
}
/*PURE_END*/
function fp(x){if(x==null||isNaN(x))return'—';const a=Math.abs(x),d=a>=1000?2:a>=1?3:a>=0.01?5:8;return x.toLocaleString('es-AR',{maximumFractionDigits:d})}
function fpct(x){return(x>=0?'+':'')+x.toFixed(2)+'%'}
function stageMsg(n,tf,A,o){
  const S=A.St,Z=A.Z,q=S.ref,t=S.tgt,w=o.who?o.who+', ':'',lv=q?fp(q.level):'',at=q?'en '+lv:'cercana',
   tg=t?fp(t.level)+' ('+fpct((t.level-A.live)/A.live*100)+')':'la próxima zona',
   st=q?` y con stop bajo ${fp(q.level-0.5*S.A)}`:'',sp=q?`en ${lv} (${q.touches} toques)`:'cercano',
   pl=o.entry?` Tu compra en ${fp(o.entry)}: ${fpct((A.live-o.entry)/o.entry*100)}.`:'',
   vol=S.vr>1.3?' y volumen alto':'',p=`${tf}: ${fp(A.live)}`;
  const T={
   'buy-near':[`👀 ${n} se acerca a una zona de compra`,`${w}${p}, zona ${at}. Todavía no llegó: esperá a ver si frena y rebota.`],
   'buy-in':[`🟢 ${n} está en zona de compra`,`${w}${p}, soporte ${sp}, puntaje ${Z.buy}/100. Si comprás, mejor en partes${st}.`],
   'sell-near':[`👀 ${n} se acerca a una zona de venta`,`${w}${p}, zona ${at}. Si ya tenés, andá evaluando tomar ganancias.`],
   'sell-in':[`🔴 ${n} está en zona de venta`,`${w}${p}, resistencia ${sp}, puntaje ${Z.sell}/100. Es una zona donde el precio suele frenarse.`],
   'breakdown':[`🔻 ${n}: la caída tiene fuerza`,`${w}${p} · ${q?'Rompió '+lv:'Cae'} con velas grandes${vol} (fuerza ${S.bear}/100) y puede seguir bajando hasta ${tg}. Mejor esperar antes de comprar.`],
   'breakup':[`🚀 ${n}: la suba tiene fuerza`,`${w}${p} · ${q?'Superó '+lv:'Sube'} con velas grandes${vol} (fuerza ${S.bull}/100) y puede seguir hasta ${tg}. Evitá perseguir el precio.`]
  }[S.stage];
  if(!T)return null;
  const b=T[1]+pl;return[T[0],o.hi?b:b.split('. ')[0]+'.'+pl];
}
const API={ema,sma,bbands,atr,rsi,analyze,stageMsg,fp,fpct};
if(typeof module==="object"&&module.exports)module.exports=API;else Object.assign(root,API);

module.exports = API;

