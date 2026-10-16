const {test}=require('node:test');
const assert=require('node:assert/strict');
const {setupTouchControls}=require('../touch-controls.js');
function target(){const handlers={};return {dataset:{},addEventListener(name,fn){handlers[name]=fn},setPointerCapture(){},closest(){return null},getBoundingClientRect(){return {width:300}},emit(type,values={}){handlers[type]?.({button:0,pointerId:1,clientX:100,clientY:100,target:this,preventDefault(){},...values})}};}
function controls(){
  const calls=[],buttons=['left','right','down','rotate','drop'].map(name=>{const b=target();b.dataset.action=name;return b});
  const surface=target(),events=target(),window=target();let time=0,playing=true;
  const controller=setupTouchControls({buttons,surface,canPlay:()=>playing,action:name=>calls.push(name),eventTarget:events,windowTarget:window,now:()=>time});
  return {calls,button:name=>buttons.find(b=>b.dataset.action===name),surface,events,window,controller,advance(t){time=t;controller.update(t)},pause(){playing=false}};
}
test('押した瞬間に移動し、長押しで反復。指を離すと止まりクリックで二重入力しない',()=>{
  const c=controls(),b=c.button('left');b.emit('pointerdown');assert.deepEqual(c.calls,['left']);
  c.advance(249);assert.equal(c.calls.length,1);c.advance(250);c.advance(335);assert.equal(c.calls.length,3);
  b.emit('pointerup');b.emit('click',{detail:1});c.advance(1000);assert.equal(c.calls.length,3);
  b.emit('click',{detail:0});assert.equal(c.calls.length,4);
});
test('回転と即落下は長押しでも一度だけ実行する',()=>{
  for(const action of ['rotate','drop']){const c=controls();c.button(action).emit('pointerdown');c.advance(500);c.advance(1000);assert.deepEqual(c.calls,[action]);}
});
test('中断・フォーカス離脱・非表示・一時停止で長押しが止まる',()=>{
  for(const cancel of ['pointercancel','lostpointercapture','blur','visibilitychange','paused','reset']){
    const c=controls(),b=c.button('down');b.emit('pointerdown');
    if(cancel==='blur')c.window.emit(cancel);else if(cancel==='visibilitychange')c.events.emit(cancel);else if(cancel==='paused')c.pause();else if(cancel==='reset')c.controller.reset();else b.emit(cancel);
    c.advance(500);assert.deepEqual(c.calls,['down']);
  }
});
test('盤面タップで一度だけ回転し、キャンセルやボタンからの操作では回転しない',()=>{
  const c=controls();c.surface.emit('pointerdown');c.surface.emit('pointerup');assert.deepEqual(c.calls,['rotate']);
  c.surface.emit('pointerdown');c.surface.emit('pointercancel');c.surface.emit('pointerup');assert.equal(c.calls.length,1);
  c.surface.emit('pointerdown',{target:{closest:()=>({})}});c.surface.emit('pointerup');assert.equal(c.calls.length,1);
});
test('横ドラッグは複数列移動し、下ドラッグは下移動のみ。離した際に回転や即落下しない',()=>{
  const c=controls();c.surface.emit('pointerdown');c.surface.emit('pointermove',{clientX:200});c.surface.emit('pointerup',{clientX:200});assert.deepEqual(c.calls,['right','right','right']);
  c.surface.emit('pointerdown');c.surface.emit('pointermove',{clientY:170});c.surface.emit('pointerup',{clientY:170});assert.deepEqual(c.calls.slice(3),['down','down']);
});
test('別の指の終了イベントや開始イベントで進行中のドラッグを壊さない',()=>{
  const c=controls();c.surface.emit('pointerdown');c.surface.emit('pointerdown',{pointerId:2});c.surface.emit('pointerup',{pointerId:2});c.surface.emit('pointermove',{clientX:60});c.surface.emit('pointerup',{clientX:60});assert.deepEqual(c.calls,['left']);
});
