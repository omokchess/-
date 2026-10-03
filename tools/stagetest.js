// 무대 배경 + 인물 배치 미리보기.  node tools/stagetest.js out.png
const fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');
const root = path.join(__dirname, '..'), out = process.argv[2] || '/tmp/stage.png';
const js = ['core.js', 'rig.js', 'rig_foes.js', 'stage.js'].map(f => fs.readFileSync(path.join(root, 'src', f), 'utf8')).join('\n');
const html = `<!doctype html><body style="margin:0;background:#000"><canvas id="c"></canvas><script>${js}
const pairs=[['ash','hemoblade','clockwarden'],['market','ember','butcher'],['library','bell','librarian'],['theater','duelist','diva'],['workshop','bulwark','masque'],['tracks','gambler','express'],['festival','poet','grin'],['quarry','gunner','colossus'],['sewing','puppeteer','seamstress'],['garden','clock','moons'],['mirror','duelist','mirror'],['lethe','hemoblade','lethe']];
const W=400,H=380,dpr=1,cols=3,c=document.getElementById('c');c.width=W*cols;c.height=H*Math.ceil(pairs.length/cols);const x=c.getContext('2d');
pairs.forEach(([th,h,f],i)=>{const ox=(i%cols)*W,oy=Math.floor(i/cols)*H;const b=document.createElement('canvas');b.width=W;b.height=H;const bc=b.getContext('2d');drawBG(bc,th,W,H,1);x.drawImage(b,ox,oy);
 x.save();x.translate(ox,oy);const k=1;
 const me=RIG.make({kind:'hero',look:HERO_LOOK[h],x:W*.25,y:H*.84,face:1,sc:1.42});const L=FOE_LOOK[f];const fo=RIG.make({kind:'foe',look:L,x:W*.72,y:H*(L.boss?.8:.82),face:-1,sc:L.sc});
 for(const a of [fo,me]){const q=RIG.pose(a,1500);x.fillStyle='rgba(5,3,12,.4)';x.beginPath();x.ellipse(a.x,a.y+2,a.box.w*.5*a.sc*(L.shadow||1),5,0,0,7);x.fill();RIG.draw(x,a,q,1500,1)}
 x.restore();x.fillStyle='#fff';x.font='12px sans-serif';x.fillText(th,ox+6,oy+14)});
document.title='done';</script>`;
(async () => { const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' }); const pg = await b.newPage(); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.setContent(html); await pg.waitForFunction(() => document.title === 'done', null, { timeout: 5000 }).catch(() => {}); await (await pg.$('#c')).screenshot({ path: out }); if (errs.length) console.log(errs); await b.close(); console.log('saved'); })();
