const {test}=require('node:test');
const assert=require('node:assert/strict');
const {findMatches,applyGravity}=require('../game.js');
const board=()=>Array.from({length:12},()=>Array(6).fill(null));
const put=(b,x,y,g=0)=>b[y][x]={group:g,char:'海'};
test('同じ部首の異なる漢字が4つつながると消える',()=>{const b=board();['海','池','泳','波'].forEach((char,x)=>b[11][x]={group:0,char});assert.equal(findMatches(b).length,4);});
test('斜めと異なる部首、3個以下は消えない',()=>{const b=board();for(let i=0;i<4;i++)put(b,i,i);assert.equal(findMatches(b).length,0);const c=board();for(let i=0;i<3;i++)put(c,i,11);put(c,3,11,1);assert.equal(findMatches(c).length,0);});
test('折れ曲がったつながりと複数グループを同時に検出',()=>{const b=board();[[0,11],[1,11],[1,10],[2,10]].forEach(([x,y])=>put(b,x,y));[[5,11],[5,10],[5,9],[5,8],[5,7]].forEach(([x,y])=>put(b,x,y,1));assert.equal(findMatches(b).length,9);});
test('重力は順序を保ち、消去後に連鎖が発生する',()=>{const b=board();for(let x=0;x<4;x++)put(b,x,11);for(let x=0;x<3;x++)put(b,x,10,1);put(b,3,9,1);const matches=findMatches(b);assert.equal(matches.length,4);matches.forEach(([x,y])=>b[y][x]=null);applyGravity(b);assert.equal(findMatches(b).length,4);assert.equal(b[11][3].group,1);assert.equal(b[9][3],null);});

const {positions,validPiece,rotatePiece,QUICK_TURN_MS}=require('../game.js');
const pair=(rotation=0,x=2,y=6)=>({x,y,rotation,tiles:[{group:0,char:'海'},{group:1,char:'林'}]});
function corridor(x=2){const b=board();for(let y=0;y<12;y++){if(x>0)put(b,x-1,y);if(x<5)put(b,x+1,y);}return b;}
test('空いている場所では最初の入力で通常回転する',()=>{const p=pair();const result=rotatePiece(board(),p,null,100);assert.equal(result.piece.rotation,1);assert.equal(result.piece.tiles,p.tiles);assert.equal(result.attempt,null);});
test('狭い縦穴で素早く2回回転すると同じ2マスの上下が入れ替わる',()=>{for(const rotation of [0,2])for(const x of [0,2,5]){const b=corridor(x),p=pair(rotation,x);const first=rotatePiece(b,p,null,100);assert.equal(first.piece,p);const second=rotatePiece(b,first.piece,first.attempt,400);assert.deepEqual(positions(second.piece),positions(p));assert.deepEqual(second.piece.tiles,[p.tiles[1],p.tiles[0]]);assert.ok(validPiece(b,second.piece));assert.equal(second.attempt,null);assert.deepEqual(p.tiles.map(t=>t.char),['海','林']);}});
test('連打の間隔が長すぎると入れ替えず次の入力を待つ',()=>{const b=corridor(),p=pair();const result=rotatePiece(b,p,100,101+QUICK_TURN_MS);assert.equal(result.piece,p);assert.equal(result.attempt,101+QUICK_TURN_MS);});
test('入れ替えを繰り返して元に戻せる',()=>{const b=corridor(),p=pair();let result=rotatePiece(b,p,null,0);result=rotatePiece(b,result.piece,result.attempt,100);assert.notDeepEqual(result.piece.tiles,p.tiles);result=rotatePiece(b,result.piece,result.attempt,200);result=rotatePiece(b,result.piece,result.attempt,300);assert.deepEqual(result.piece,p);});
test('壁際では通常の壁蹴りを優先し、漢字の順序を保つ',()=>{const b=board(),p=pair(2,0);const result=rotatePiece(b,p,100,200);assert.equal(result.piece.rotation,3);assert.equal(result.piece.x,1);assert.equal(result.piece.tiles,p.tiles);assert.equal(result.attempt,null);assert.ok(validPiece(b,result.piece));});
test('床際でも通常の上方向への補正を保つ',()=>{const b=board(),p=pair(1,2,11);const result=rotatePiece(b,p,null,100);assert.equal(result.piece.rotation,2);assert.equal(result.piece.y,10);assert.ok(validPiece(b,result.piece));});
test('横向きで回転できないときは入れ替えない',()=>{const b=board(),p=pair(1);for(let x=0;x<6;x++){put(b,x,5);put(b,x,7);}const result=rotatePiece(b,p,100,200);assert.equal(result.piece,p);assert.equal(result.attempt,null);});

const {difficultyFor}=require('../game.js');
test('速度は20字ごと、色のヒントは10字ごとに変わる',()=>{
  assert.deepEqual(difficultyFor(0),{fallInterval:850,colorPercent:100});
  assert.deepEqual(difficultyFor(9),difficultyFor(0));
  assert.deepEqual(difficultyFor(10),{fallInterval:850,colorPercent:90});
  assert.deepEqual(difficultyFor(19),{fallInterval:850,colorPercent:90});
  assert.deepEqual(difficultyFor(20),{fallInterval:795,colorPercent:80});
  assert.deepEqual(difficultyFor(99),{fallInterval:630,colorPercent:10});
  assert.deepEqual(difficultyFor(100),{fallInterval:575,colorPercent:0});
  assert.deepEqual(difficultyFor(199),{fallInterval:355,colorPercent:0});
  assert.deepEqual(difficultyFor(200),{fallInterval:300,colorPercent:0});
});
test('色は0%で止まり、従来の速度上限と初期状態を維持する',()=>{
  assert.deepEqual(difficultyFor(240),{fallInterval:220,colorPercent:0});
  assert.deepEqual(difficultyFor(10000),difficultyFor(240));
  assert.deepEqual(difficultyFor(0),{fallInterval:850,colorPercent:100});
});
