'use strict';
// Pointer Events support touch, pen, and mouse without duplicate click actions.
function setupTouchControls({buttons,surface,canPlay,action,eventTarget,windowTarget,now}){
  const holds=new Map();let gesture=null;
  function reset(){holds.clear();gesture=null;}
  for(const button of buttons){
    button.addEventListener('pointerdown',event=>{
      if(event.button!==0||!canPlay())return;
      event.preventDefault();button.setPointerCapture?.(event.pointerId);
      const name=button.dataset.action;action(name);
      if(['left','right','down'].includes(name))holds.set(event.pointerId,{name,next:now()+250});
    });
    const release=event=>holds.delete(event.pointerId);
    for(const type of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(type,release);
    // Keyboard and assistive-technology activation have no pointer click count.
    button.addEventListener('click',event=>{if(event.detail===0)action(button.dataset.action);});
    button.addEventListener('contextmenu',event=>event.preventDefault());
  }
  surface.addEventListener('pointerdown',event=>{
    if(event.button!==0||!canPlay()||event.target.closest('button')||gesture)return;
    event.preventDefault();surface.setPointerCapture?.(event.pointerId);
    const rect=surface.getBoundingClientRect();
    gesture={id:event.pointerId,x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY,moved:false,step:Math.max(18,Math.min(42,rect.width/6*.65))};
  });
  surface.addEventListener('pointermove',event=>{
    if(!gesture||gesture.id!==event.pointerId||!canPlay())return;
    event.preventDefault();const g=gesture;
    if(Math.hypot(event.clientX-g.startX,event.clientY-g.startY)>10)g.moved=true;
    const dx=event.clientX-g.x,dy=event.clientY-g.y;
    if(Math.abs(dx)>=g.step&&Math.abs(dx)>=Math.abs(dy)){
      const steps=Math.min(6,Math.floor(Math.abs(dx)/g.step));
      for(let i=0;i<steps;i++)action(dx>0?'right':'left');
      g.x+=Math.sign(dx)*steps*g.step;g.y=event.clientY;
    }else if(dy>=g.step){
      const steps=Math.min(12,Math.floor(dy/g.step));
      for(let i=0;i<steps;i++)action('down');
      g.y+=steps*g.step;g.x=event.clientX;
    }
  });
  surface.addEventListener('pointerup',event=>{
    if(!gesture||gesture.id!==event.pointerId)return;
    const tap=!gesture.moved&&Math.hypot(event.clientX-gesture.startX,event.clientY-gesture.startY)<=10;
    gesture=null;if(tap&&canPlay())action('rotate');
  });
  const cancel=event=>{if(gesture?.id===event.pointerId)gesture=null;};
  surface.addEventListener('pointercancel',cancel);surface.addEventListener('lostpointercapture',cancel);
  windowTarget.addEventListener('blur',reset);eventTarget.addEventListener('visibilitychange',reset);
  return {reset,update(time){
    if(!canPlay()){reset();return;}
    for(const hold of holds.values())if(time>=hold.next){action(hold.name);hold.next=time+85;}
  }};
}
if(typeof module!=='undefined')module.exports={setupTouchControls};
