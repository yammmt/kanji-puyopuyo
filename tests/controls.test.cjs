const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');

function game(){
  const elements=new Map();let frame,now=0,randomCalls=0;
  const make=()=>({style:{setProperty(){}},dataset:{},classList:{add(){},remove(){}},children:[],innerHTML:'',textContent:'',appendChild(child){this.children.push(child)},replaceChildren(){this.children=[];this.innerHTML='';this.textContent=''},addEventListener(type,handler){this[type]=handler}});
  const get=id=>{if(!elements.has(id))elements.set(id,make());return elements.get(id)};
  const buttons=['left','right','down','drop','rotate'].map(action=>{const button=make();button.dataset.action=action;return button});
  const math=Object.create(Math);
  // Cycle radicals per tile so the central tower never clears itself.
  math.random=()=>{const call=randomCalls++;return call%2===0?(Math.floor(call/2)%5+.1)/5:0};
  vm.runInNewContext(fs.readFileSync(require.resolve('../game.js'),'utf8'),{
    document:{getElementById:get,createElement:make,querySelector:get,querySelectorAll:()=>buttons,addEventListener(){}},
    window:{matchMedia:()=>({matches:true})},localStorage:{getItem:()=>null,setItem(){}},
    performance:{now:()=>now},Math:math,requestAnimationFrame(callback){frame=callback},setTimeout
  });
  const press=action=>buttons.find(button=>button.dataset.action===action).click();
  const advance=ms=>{while(ms>0){const dt=Math.min(100,ms);now+=dt;ms-=dt;frame(now)}};
  get('start').onclick();
  return {get,press,advance};
}
test('最上段まで積んだ出現列から横へ移動してプレイを続けられる',()=>{
  const g=game();for(let i=0;i<6;i++)g.press('drop');
  assert.equal(g.get('status').textContent,'PLAYING');assert.equal(g.get('entry-board').hidden,false);
  g.press('left');g.press('drop');
  assert.notEqual(g.get('status').textContent,'GAME OVER');
  const cells=g.get('board').children;
  assert.ok(cells[11*6+1].innerHTML);assert.ok(cells[10*6+1].innerHTML);
  assert.equal(g.get('cleared').textContent,0);
});
test('上端で下キーを押しても即終了せず、0.5秒以内なら横へ逃がせる',()=>{
  const g=game();for(let i=0;i<6;i++)g.press('drop');
  g.press('down');g.advance(400);assert.equal(g.get('status').textContent,'PLAYING');
  g.press('right');g.advance(100);assert.equal(g.get('status').textContent,'PLAYING');
});
test('はみ出したまま0.5秒接地、または即落下すると終了する',()=>{
  const g=game();for(let i=0;i<6;i++)g.press('drop');
  g.advance(400);assert.equal(g.get('status').textContent,'PLAYING');g.advance(100);assert.equal(g.get('status').textContent,'GAME OVER');
  g.get('restart').onclick();for(let i=0;i<7;i++)g.press('drop');assert.equal(g.get('status').textContent,'GAME OVER');
});
test('接地したままの横移動で固定猶予を無制限に延長しない',()=>{
  const g=game();for(let i=0;i<6;i++)g.press('drop');
  // Fill the adjacent column, then move a pair across the two full columns above the board.
  g.press('left');for(let i=0;i<6;i++){g.press('drop');g.press('left');}
  g.advance(400);g.press('right');g.advance(100);assert.equal(g.get('status').textContent,'GAME OVER');
});
