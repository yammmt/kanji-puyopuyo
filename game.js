'use strict';
const GROUPS = [
  {id:'water', radical:'氵',name:'さんずい',chars:[...'海池泳波河湖洗流']},
  {id:'wood',radical:'木',name:'きへん',chars:[...'林村松枝板橋梅柱']},
  {id:'hand',radical:'扌',name:'てへん',chars:[...'持打投拾指押折招']},
  {id:'mouth',radical:'口',name:'くちへん',chars:[...'味唱呼吸吹咲鳴唄']},
  {id:'grass',radical:'艹',name:'くさかんむり',chars:[...'花草茶葉芽苗若苦']}
];
const W=6,H=12;
function findMatches(grid){
  const visited=new Set(),matches=[];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const key=y*W+x;if(!grid[y][x]||visited.has(key))continue;
    const group=[],queue=[[x,y]],id=grid[y][x].group;visited.add(key);
    while(queue.length){const [cx,cy]=queue.pop();group.push([cx,cy]);for(const [nx,ny] of [[cx-1,cy],[cx+1,cy],[cx,cy-1],[cx,cy+1]]){
      const k=ny*W+nx;if(nx>=0&&nx<W&&ny>=0&&ny<H&&!visited.has(k)&&grid[ny][nx]?.group===id){visited.add(k);queue.push([nx,ny]);}
    }}if(group.length>=4)matches.push(...group);
  }return matches;
}
function applyGravity(grid){for(let x=0;x<W;x++){const column=grid.map(row=>row[x]).filter(Boolean);for(let y=H-1;y>=0;y--)grid[y][x]=column.pop()||null;}}
function positions(piece){const offsets=[[0,-1],[1,0],[0,1],[-1,0]];const [dx,dy]=offsets[piece.rotation];return [[piece.x,piece.y],[piece.x+dx,piece.y+dy]];}
function validPiece(grid,piece){return positions(piece).every(([x,y])=>x>=0&&x<W&&y>=0&&y<H&&!grid[y][x]);}
function difficultyFor(cleared){
  const level=Math.floor(Math.max(0,cleared)/20);
  return {fallInterval:Math.max(220,850-level*55),colorPercent:Math.max(0,100-Math.floor(Math.max(0,cleared)/10)*10)};
}
const QUICK_TURN_MS=500;
function rotatePiece(grid,piece,previousAttempt=null,now=0){
  for(const [dx,dy] of [[0,0],[-1,0],[1,0],[0,-1]]){
    const candidate={...piece,x:piece.x+dx,y:piece.y+dy,rotation:(piece.rotation+1)%4};
    if(validPiece(grid,candidate))return {piece:candidate,attempt:null};
  }
  // Only a vertical pair can turn around inside a one-column gap.
  if(piece.rotation%2===0){
    if(previousAttempt!==null&&now>=previousAttempt&&now-previousAttempt<=QUICK_TURN_MS){
      return {piece:{...piece,tiles:[piece.tiles[1],piece.tiles[0]]},attempt:null};
    }
    return {piece,attempt:now};
  }
  return {piece,attempt:null};
}
if(typeof module!=='undefined')module.exports={findMatches,applyGravity,GROUPS,positions,validPiece,rotatePiece,QUICK_TURN_MS,difficultyFor};
if(typeof document!=='undefined'){
const $=id=>document.getElementById(id);
let rotationAttempt=null;
let grid,active,next,score=0,cleared=0,maxChain=0,best=0,state='ready',last=0,elapsed=0,run=0;
try{best=Number(localStorage.getItem('kanji-puyo-best'))||0;}catch{}
$('best').textContent=best;
const randomTile=()=>{const group=Math.floor(Math.random()*GROUPS.length);return {group,char:GROUPS[group].chars[Math.floor(Math.random()*GROUPS[group].chars.length)]};};
const randomPair=()=>[randomTile(),randomTile()];
function tileHTML(tile,extra=''){const g=GROUPS[tile.group];return `<div class="tile ${g.id} ${extra}" aria-label="${tile.char}、${g.name}">${tile.char}<small>${g.radical}</small></div>`;}
$('legend').innerHTML=GROUPS.map(g=>`<div class="legend-row"><div class="tile ${g.id}">${g.radical}</div><span><strong>${g.name}</strong></span></div>`).join('');
const cells=[];for(let i=0;i<W*H;i++){const cell=document.createElement('div');cell.className='cell';$('board').appendChild(cell);cells.push(cell);}
function valid(piece){return validPiece(grid,piece);}
function render(){const difficulty=difficultyFor(cleared);document.querySelector('.game-layout').style.setProperty('--color-strength',`${difficulty.colorPercent}%`);$('color-level').textContent=`色のヒント ${difficulty.colorPercent}%`;cells.forEach((c,i)=>{c.innerHTML=grid[Math.floor(i/W)][i%W]?tileHTML(grid[Math.floor(i/W)][i%W]):'';c.classList.remove('clearing');});
if(active){const ghost={...active};while(valid({...ghost,y:ghost.y+1}))ghost.y++;positions(ghost).forEach(([x,y],i)=>{if(!grid[y][x])cells[y*W+x].innerHTML=tileHTML(active.tiles[i],'ghost');});positions(active).forEach(([x,y],i)=>{cells[y*W+x].innerHTML=tileHTML(active.tiles[i],'active');});}
$('next').innerHTML=next.map(t=>tileHTML(t)).reverse().join('');$('score').textContent=String(score).padStart(5,'0');$('cleared').textContent=cleared;$('max-chain').textContent=maxChain;$('best').textContent=best;
}
function showOverlay(kicker,title,description,button){$('overlay').hidden=false;$('overlay').innerHTML=`<span class="overlay-kicker">${kicker}</span><h2>${title}</h2><p>${description}</p><button class="primary" id="overlay-action">${button} →</button>`;$('overlay-action').onclick=state==='paused'?togglePause:start;}
function spawn(){rotationAttempt=null;active={x:2,y:1,rotation:0,tiles:next};next=randomPair();elapsed=0;if(!valid(active)){active=null;state='over';$('status').textContent='GAME OVER';showOverlay('GOOD PLAY!','また、つなげよう。',`スコア ${score} 点 ・ 最大 ${maxChain} 連鎖<br>もう一度、挑戦してみませんか。`,'もう一度遊ぶ');}render();}
function start(){run++;grid=Array.from({length:H},()=>Array(W).fill(null));next=randomPair();score=0;cleared=0;maxChain=0;active=null;state='playing';$('overlay').hidden=true;$('chain-message').textContent='';$('status').textContent='PLAYING';$('pause').textContent='Ⅱ';spawn();}
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function lock(){const token=run;positions(active).forEach(([x,y],i)=>grid[y][x]=active.tiles[i]);active=null;state='resolving';applyGravity(grid);render();let chain=0;
while(true){const matches=findMatches(grid);if(!matches.length)break;chain++;$('chain-message').textContent=`${chain} 連鎖！`;matches.forEach(([x,y])=>cells[y*W+x].classList.add('clearing'));await wait(420);if(token!==run)return;matches.forEach(([x,y])=>grid[y][x]=null);score+=matches.length*10*2**(chain-1);cleared+=matches.length;maxChain=Math.max(maxChain,chain);if(score>best){best=score;try{localStorage.setItem('kanji-puyo-best',String(best));}catch{}}applyGravity(grid);render();await wait(230);if(token!==run)return;}
$('chain-message').textContent='';state='playing';spawn();}
function move(dx,dy){if(state!=='playing')return false;const candidate={...active,x:active.x+dx,y:active.y+dy};if(valid(candidate)){if(dx!==0)rotationAttempt=null;active=candidate;render();return true;}if(dy>0)void lock();return false;}
function rotate(){if(state!=='playing')return;const result=rotatePiece(grid,active,rotationAttempt,performance.now());active=result.piece;rotationAttempt=result.attempt;render();}
function drop(){if(state!=='playing')return;while(valid({...active,y:active.y+1}))active.y++;void lock();}
function togglePause(){if(state==='playing'){rotationAttempt=null;state='paused';$('status').textContent='PAUSED';$('pause').textContent='▶';showOverlay('TAKE A BREAK','ひとやすみ。','準備ができたら、続きをどうぞ。','ゲームに戻る');}else if(state==='paused'){state='playing';elapsed=0;$('overlay').hidden=true;$('status').textContent='PLAYING';$('pause').textContent='Ⅱ';}}
function action(name){if(name==='left')move(-1,0);if(name==='right')move(1,0);if(name==='down')move(0,1);if(name==='rotate')rotate();if(name==='drop')drop();}
document.addEventListener('keydown',event=>{if($('help').open)return;const actions={ArrowLeft:'left',ArrowRight:'right',ArrowDown:'down',ArrowUp:'rotate',' ':'drop'};if(actions[event.key]){if(event.target.closest('button')&&event.key===' ')return;event.preventDefault();if(!event.repeat||!['rotate','drop'].includes(actions[event.key]))action(actions[event.key]);}if(event.key.toLowerCase()==='p')togglePause();});
document.querySelectorAll('[data-action]').forEach(button=>button.addEventListener('click',()=>action(button.dataset.action)));
$('start').onclick=start;$('restart').onclick=start;$('pause').onclick=togglePause;
$('help-button').onclick=()=>{if(state==='playing')togglePause();$('help').showModal();};$('close-help').onclick=()=>$('help').close();
document.addEventListener('visibilitychange',()=>{if(document.hidden&&state==='playing')togglePause();});
function tick(now){const delta=Math.min(now-last,100);last=now;if(state==='playing'){elapsed+=delta;if(elapsed>=difficultyFor(cleared).fallInterval){elapsed=0;move(0,1);}}requestAnimationFrame(tick);}
grid=Array.from({length:H},()=>Array(W).fill(null));next=randomPair();render();requestAnimationFrame(tick);
}
