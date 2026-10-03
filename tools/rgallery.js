// 리그 갤러리: 영웅·적을 여러 자세로 그려 스크린샷을 찍는다.  node tools/rgallery.js [heroes|foes|bosses] out.png
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const root = path.join(__dirname, '..');
const mode = process.argv[2] || 'heroes', out = process.argv[3] || '/tmp/gal.png';
const files = ['core.js', 'rig.js', 'rig_foes.js', 'data_foes.js'].filter(f => fs.existsSync(path.join(root, 'src', f)));
const js = files.map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
const html = `<!doctype html><html><body style="margin:0;background:#1d1838"><canvas id="c"></canvas><script>${js}
const MODE=${JSON.stringify(mode)};
const c=document.getElementById('c'),dpr=2;
let items=[];
if(MODE==='heroes'){
  const poses=[null,'slashA@150','cast@330','guard@200','hit@60','focus@500'];
  for(const id of Object.keys(HERO_LOOK))for(const ps of poses)items.push({id,ps,kind:'hero',look:Object.assign({seed:0},HERO_LOOK[id])});
}else if(MODE.startsWith('hero:')){
  const id=MODE.slice(5);const poses=[null,'slashA@80','slashA@150','slashB@140','thrust@140','smash@220','cast@330','shoot@140','buff@300','guard@200','parry@120','hit@60','stagger@300','focus@500','victory@500','die@700'];
  for(const ps of poses)items.push({id,ps,kind:'hero',look:HERO_LOOK[id]});
}else if(MODE==='lineup'){for(const id of Object.keys(HERO_LOOK))items.push({id,ps:null,kind:'hero',look:HERO_LOOK[id]});
}else if(typeof FOE_LOOK!=='undefined'){
  const ids=Object.keys(FOE_LOOK).filter(k=>MODE==='all'||(MODE==='bosses'?FOE_LOOK[k].boss:MODE==='foes'?!FOE_LOOK[k].boss:k===MODE));
  for(const id of ids)for(const ps of (MODE===id?[null,'bcast@400','battack@400','bhit@70','bstagger@300']:[null]))items.push({id,ps,kind:'foe',look:FOE_LOOK[id]});
}
const big=MODE==='bosses'||MODE.startsWith('boss')||(typeof FOE_LOOK!=='undefined'&&FOE_LOOK[MODE]&&FOE_LOOK[MODE].boss);
const zoom=MODE.startsWith('hero:')||MODE==='lineup';const cw=big?260:(zoom?230:150),ch=big?300:(zoom?270:180),cols=MODE==='heroes'?6:(big?4:(zoom?5:6));
const rows=Math.ceil(items.length/cols);
c.width=cw*cols*dpr;c.height=ch*rows*dpr;c.style.width=cw*cols+'px';c.style.height=ch*rows+'px';
const x=c.getContext('2d');
items.forEach((it,i)=>{const col=i%cols,row=Math.floor(i/cols);
  x.setTransform(dpr,0,0,dpr,0,0);x.fillStyle=(col+row)%2?'#241e44':'#2a2350';x.fillRect(col*cw,row*ch,cw,ch);
  x.fillStyle='#fff8';x.font='11px sans-serif';x.fillText(it.id+(it.ps?' '+it.ps:''),col*cw+4,row*ch+12);
  const sc=it.kind==='hero'?(zoom?2.6:1.45):(it.look.sc||1);
  const a=RIG.make({kind:it.kind,look:it.look,x:col*cw+cw*0.45,y:row*ch+ch-18,face:it.kind==='hero'?1:-1,sc});
  x.fillStyle='rgba(0,0,0,.35)';x.beginPath();x.ellipse(a.x,a.y+2,30*sc*(it.look.shadow||1),5,0,0,7);x.fill();
  let now=1000;
  if(it.ps){const [n,ms]=it.ps.split('@');a.t0=0;RIG.play(a,n,{dist:0});a.anim.t0=1000;now=1000+(+ms);}
  const q=RIG.pose(a,now);RIG.draw(x,a,q,now,dpr);
});
document.title='done';
</script></body></html>`;
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
  const pg = await b.newPage();
  const errs = []; pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await pg.setContent(html); await pg.waitForFunction(() => document.title === 'done', null, { timeout: 5000 }).catch(() => {});
  const el = await pg.$('#c'); await el.screenshot({ path: out });
  if (errs.length) console.log('ERR', errs.slice(0, 5));
  await b.close(); console.log('saved', out);
})();
