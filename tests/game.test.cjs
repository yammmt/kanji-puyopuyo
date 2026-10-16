const {test}=require('node:test');
const assert=require('node:assert/strict');
const {findMatches,applyGravity}=require('../game.js');
const board=()=>Array.from({length:12},()=>Array(6).fill(null));
const put=(b,x,y,g=0)=>b[y][x]={group:g,char:'海'};
test('同じ部首の異なる漢字が4つつながると消える',()=>{const b=board();['海','池','泳','波'].forEach((char,x)=>b[11][x]={group:0,char});assert.equal(findMatches(b).length,4);});
test('斜めと異なる部首、3個以下は消えない',()=>{const b=board();for(let i=0;i<4;i++)put(b,i,i);assert.equal(findMatches(b).length,0);const c=board();for(let i=0;i<3;i++)put(c,i,11);put(c,3,11,1);assert.equal(findMatches(c).length,0);});
test('折れ曲がったつながりと複数グループを同時に検出',()=>{const b=board();[[0,11],[1,11],[1,10],[2,10]].forEach(([x,y])=>put(b,x,y));[[5,11],[5,10],[5,9],[5,8],[5,7]].forEach(([x,y])=>put(b,x,y,1));assert.equal(findMatches(b).length,9);});
test('重力は順序を保ち、消去後に連鎖が発生する',()=>{const b=board();for(let x=0;x<4;x++)put(b,x,11);for(let x=0;x<3;x++)put(b,x,10,1);put(b,3,9,1);const matches=findMatches(b);assert.equal(matches.length,4);matches.forEach(([x,y])=>b[y][x]=null);applyGravity(b);assert.equal(findMatches(b).length,4);assert.equal(b[11][3].group,1);assert.equal(b[9][3],null);});
