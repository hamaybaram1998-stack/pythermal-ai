'use strict';
const $=id=>document.getElementById(id),video=$('camera'),canvas=$('view'),ctx=canvas.getContext('2d',{willReadFrequently:true});
const status=$('status'),mode=$('mode'),palette=$('palette'),brightness=$('brightness'),contrast=$('contrast'),smooth=$('smooth'),auto=$('auto');
let stream=null,facing='environment',frame=0,previous=null,previousGray=null,frameNo=0,model=null,aiEnabled=false,detectBusy=false,lastDetect=0,detections=[],cameraGeneration=0,lastRender=0;
const aiCanvas=document.createElement('canvas');aiCanvas.width=224;aiCanvas.height=224;const aiCtx=aiCanvas.getContext('2d',{willReadFrequently:true});
const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
function thermal(v){
 if(palette.value==='gray')return [v,v,v];
 if(palette.value==='iron')return [clamp(v*1.8-90),clamp(v*1.5-180),clamp(v*1.3-250)];
 const stops=[[0,0,10,60],[64,0,90,220],[128,20,220,125],[192,255,215,0],[255,255,35,10]];
 for(let i=1;i<stops.length;i++)if(v<=stops[i][0]){const a=stops[i-1],b=stops[i],t=(v-a[0])/(b[0]-a[0]);return [1,2,3].map(k=>clamp(a[k]+(b[k]-a[k])*t));}
 return [255,35,10];
}
function loadScript(url){
 return new Promise((resolve,reject)=>{const s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=()=>reject(new Error('Could not download AI library'));document.head.appendChild(s);});
}
$('ai').addEventListener('click',async()=>{
 if(aiEnabled)return;
 $('ai').disabled=true;$('aiStatus').textContent='AI: loading (requires internet)...';
 try{
  if(!window.tf)await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
  if(!window.cocoSsd)await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
  if(!model)model=await cocoSsd.load({base:'lite_mobilenet_v2'});
  aiEnabled=true;$('aiStatus').textContent='AI: ready (visible objects only)';
 }catch(e){$('aiStatus').textContent='AI unavailable: '+e.message;}
 finally{$('ai').disabled=false;}
});
$('aiOff').addEventListener('click',()=>{aiEnabled=false;detections=[];$('aiStatus').textContent='AI: off';});
async function detect(gen){
 if(!model||!aiEnabled||!stream||detectBusy||video.readyState<2)return;
 detectBusy=true;
 try{
  aiCtx.drawImage(video,0,0,aiCanvas.width,aiCanvas.height);
  const found=await model.detect(aiCanvas,5,0.55);
  const sx=video.videoWidth/aiCanvas.width,sy=video.videoHeight/aiCanvas.height;
  for(const item of found){item.bbox=[item.bbox[0]*sx,item.bbox[1]*sy,item.bbox[2]*sx,item.bbox[3]*sy];}
  if(gen===cameraGeneration&&aiEnabled&&stream){
   detections=found;$('aiStatus').textContent='AI: '+(found.length?found.map(x=>x.class+' '+Math.round(x.score*100)+'%').join(', '):'no objects found');
  }
 }catch(e){$('aiStatus').textContent='AI error: '+e.message;aiEnabled=false;detections=[];}
 finally{detectBusy=false;}
}
function drawBoxes(w,h){
 if(!aiEnabled||!detections.length||!video.videoWidth)return;
 const sx=w/video.videoWidth,sy=h/video.videoHeight;
 ctx.lineWidth=Math.max(2,w/220);ctx.font=Math.max(12,Math.round(w/38))+'px sans-serif';
 for(const obj of detections){
  const [x,y,bw,bh]=obj.bbox,xx=x*sx,yy=y*sy;
  ctx.strokeStyle='#00ffad';ctx.strokeRect(xx,yy,bw*sx,bh*sy);
  const label=obj.class+' '+Math.round(obj.score*100)+'%';
  const tw=ctx.measureText(label).width+10,ly=Math.max(0,yy-20);
  ctx.fillStyle='#003c31';ctx.fillRect(xx,ly,tw,20);ctx.fillStyle='#ffffff';ctx.fillText(label,xx+5,ly+15);
 }
}
function render(now){
 if(!stream)return;
 if(video.readyState>=2&&video.videoWidth>0&&now-lastRender>=85){
  lastRender=now;
  const w=Math.min(256,video.videoWidth),h=Math.max(1,Math.round(w*video.videoHeight/video.videoWidth));
  if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;previous=null;previousGray=null;}
  ctx.drawImage(video,0,0,w,h);
  const img=ctx.getImageData(0,0,w,h),d=img.data,gray=new Uint8Array(w*h);
  let total=0;
  for(let p=0,i=0;i<d.length;i+=4,p++){gray[p]=clamp(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2]);total+=gray[p];}
  const mean=total/gray.length,low=mean<42,boost=auto.checked?Math.min(4.5,Math.max(1,95/Math.max(20,mean))):1;
  const b=Number(brightness.value),c=Number(contrast.value)/100,alpha=Number(smooth.value)/100;
  let diff=0,samples=0;
  const output=new Uint8ClampedArray(d.length);
  for(let p=0,i=0;i<d.length;i+=4,p++){
   const lum=clamp(((gray[p]-128)*c+128)*boost+b);
   let rgb;
   if(mode.value==='thermal')rgb=thermal(lum);
   else if(mode.value==='night')rgb=[clamp(lum*.25),lum,clamp(lum*.3)];
   else if(mode.value==='edges'){const x=p%w,y=Math.floor(p/w),edge=x>0&&y>0?Math.min(255,Math.abs(gray[p]-gray[p-1])*2+Math.abs(gray[p]-gray[p-w])*2):0;rgb=[edge,clamp(edge*.9),clamp(edge*.6)];}
   else rgb=[clamp(d[i]*boost+b),clamp(d[i+1]*boost+b),clamp(d[i+2]*boost+b)];
   for(let k=0;k<3;k++)output[i+k]=previous?clamp(rgb[k]*(1-alpha)+previous[i+k]*alpha):rgb[k];
   output[i+3]=255;
   if(previousGray&&p%16===0){diff+=Math.abs(gray[p]-previousGray[p]);samples++;}
  }
  d.set(output);ctx.putImageData(img,0,0);previous=output;previousGray=gray;
  drawBoxes(w,h);
  drawFaceOverlay(w,h);
  if(frameNo++%8===0){
   $('light').textContent='Light: '+(low?'Very low':mean<95?'Low':'OK')+' ('+Math.round(mean)+'/255)';
   $('motion').textContent='Pixel motion: '+(!samples?'—':diff/samples>16?'High':diff/samples>6?'Some':'Low');
   status.textContent=low?'LOW LIGHT: detail may be lost · NOT heat sensing':'SIMULATION · no temperature readings';
  }
  if(faceEnabled&&!faceBusy&&now-lastFace>1800){lastFace=now;void scanFace(cameraGeneration);}
  if(aiEnabled&&model&&!detectBusy&&now-lastDetect>2200){lastDetect=now;void detect(cameraGeneration);}
 }
 frame=requestAnimationFrame(render);
}
async function openCamera(){
 cameraGeneration++;
 if(!navigator.mediaDevices?.getUserMedia){status.textContent='Camera unavailable: use Chrome on localhost';return;}
 if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}
 cancelAnimationFrame(frame);previous=null;previousGray=null;frameNo=0;detections=[];faceBox=null;lastRender=0;
 status.textContent='Opening camera…';
 try{
  const next=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:facing},width:{ideal:480}}});
  stream=next;video.srcObject=stream;await video.play();frame=requestAnimationFrame(render);
 }catch(e){status.textContent='Camera error: '+e.message;}
}
$('start').addEventListener('click',openCamera);
$('flip').addEventListener('click',()=>{facing=facing==='environment'?'user':'environment';void openCamera();});
$('save').addEventListener('click',()=>{if(!stream){status.textContent='Start camera first';return;}canvas.toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='pythermal-v5-'+Date.now()+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);},'image/png');});
window.addEventListener('pagehide',()=>{cameraGeneration++;if(stream)stream.getTracks().forEach(t=>t.stop());cancelAnimationFrame(frame);});

const messages={
en:{language:'Language',subtitle:'Smart Night Vision + optional AI object recognition',start:'Start Camera',flip:'Flip Camera',save:'Save PNG',ai:'Enable AI (internet)',off:'Disable AI',mode:'Vision mode',palette:'Thermal palette',auto:'Auto low-light boost',brightness:'Brightness',contrast:'Contrast',smooth:'Noise smoothing',warning:'⚠️ Color thermal simulation only. No actual temperature readings. A physical infrared thermal sensor is required to detect heat in complete darkness.',ready:'Tap Start Camera to begin',thermal:'Thermal simulation',night:'Night vision',edges:'Smart edges',normal:'Normal',rainbow:'Rainbow',iron:'Iron',gray:'Grayscale'},
ku:{language:'زمان',subtitle:'بینینی شەو و ناسینەوەی شتەکان بە AI',start:'کردنەوەی کامێرا',flip:'گۆڕینی کامێرا',save:'پاشەکەوتکردنی وێنە',ai:'چالاککردنی AI (ئینتەرنێت)',off:'ناچالاککردنی AI',mode:'شێوازی بینین',palette:'ڕەنگەکانی گەرمی',auto:'ڕووناککردنەوەی خۆکار',brightness:'ڕووناکی',contrast:'کۆنتراست',smooth:'کەمکردنەوەی خشە',warning:'⚠️ ئەمە تەنها لاساییکردنەوەی ڕەنگی گەرمییە. پلەی گەرمی ناپێوێت. بۆ دۆزینەوەی گەرمی لە تاریکیی تەواودا سێنسەری تایبەتی پێویستە.',ready:'بۆ دەستپێکردن کامێرا بکەرەوە',thermal:'لاساییکردنەوەی گەرمی',night:'بینینی شەو',edges:'کەنارەکانی شتەکان',normal:'ئاسایی',rainbow:'هەموو ڕەنگەکان',iron:'ئاسن',gray:'ڕەش و سپی'},
ar:{language:'اللغة',subtitle:'رؤية ليلية ذكية والتعرف على الأشياء بالذكاء الاصطناعي',start:'تشغيل الكاميرا',flip:'تبديل الكاميرا',save:'حفظ الصورة',ai:'تفعيل الذكاء الاصطناعي (إنترنت)',off:'إيقاف الذكاء الاصطناعي',mode:'وضع الرؤية',palette:'ألوان المحاكاة الحرارية',auto:'تحسين الإضاءة تلقائياً',brightness:'السطوع',contrast:'التباين',smooth:'تقليل التشويش',warning:'⚠️ هذه محاكاة لونية وليست قياساً حقيقياً للحرارة. يتطلب كشف الحرارة في الظلام التام مستشعراً حرارياً خاصاً.',ready:'اضغط تشغيل الكاميرا للبدء',thermal:'محاكاة حرارية',night:'رؤية ليلية',edges:'حواف الأجسام',normal:'عادي',rainbow:'قوس قزح',iron:'حديد',gray:'رمادي'}
};
const lang=$('language');
function translate(){
 const locale=messages[lang.value]||messages.en;
 document.documentElement.lang=lang.value;document.documentElement.dir=lang.value==='en'?'ltr':'rtl';
 $('languageLabel').textContent=locale.language;
 document.querySelector('header p').textContent=locale.subtitle;
 const heading=document.querySelector('.section-heading h2');if(heading)heading.textContent=lang.value==='ku'?'کۆنترۆڵی کامێرا':lang.value==='ar'?'التحكم بالكاميرا':'Camera controls';
 const install=document.getElementById('installApp');if(install)install.textContent=lang.value==='ku'?'دامەزراندنی ئەپ':lang.value==='ar'?'تثبيت التطبيق':'Install app';
 for(const key of ['start','flip','save','ai','off'])$(key==='off'?'aiOff':key).textContent=locale[key];
 for(const key of ['mode','palette','auto','brightness','contrast','smooth']){const label=$(key).closest('label');const node=label.querySelector('span');if(node)node.textContent=locale[key];else label.firstChild.textContent=locale[key]+' ';}
 for(const key of ['thermal','night','edges','normal'])mode.querySelector('[value="'+key+'"]').textContent=locale[key];
 for(const key of ['rainbow','iron','gray'])palette.querySelector('[value="'+key+'"]').textContent=locale[key];
 document.querySelector('.warning').textContent=locale.warning;
 if(!stream)status.textContent=locale.ready;
 try{localStorage.setItem('pythermal-lang',lang.value);}catch(e){}
}
try{lang.value=localStorage.getItem('pythermal-lang')||'en';}catch(e){lang.value='en';}
lang.addEventListener('change',translate);translate();

/* v4: face location only; false-color overlay is NOT thermal measurement. */
let faceEnabled=false,faceBusy=false,lastFace=0,faceBox=null,faceDetector=null,faceModel=null;
const faceCanvas=document.createElement('canvas');faceCanvas.width=160;faceCanvas.height=160;
const faceCtx=faceCanvas.getContext('2d');
const faceStrings={
 en:{faceTitle:'Face thermal-style overlay',faceToggle:'Highlight detected face (illustration only)',faceOff:'Face detection: off',faceSearching:'Looking for a face…',faceFound:'Face detected — colors are simulated',faceMissing:'No face found; add more light',faceNote:'Decorative colors do not indicate heat or temperature.',tempTitle:'Thermometer readings',tempHelp:'Enter a reading from a real thermometer. The camera cannot measure °C.',tempLabel:'Measured body temperature (°C)',tempSave:'Save reading',tempClear:'Clear history',tempEmpty:'No readings saved',tempSaved:'Reading saved from thermometer input.',tempInvalid:'Enter a thermometer reading between 30 and 45 °C.',tempConfirm:'Delete all saved readings?',faceError:'Face detection unavailable: '},
 ku:{faceTitle:'ڕەنگکردنی دەموچاو بە شێوازی گەرمی',faceToggle:'دیاریکردنی دەموچاو (تەنها وێنەی نمایشی)',faceOff:'ناسینەوەی دەموچاو ناچالاکە',faceSearching:'گەڕان بۆ دەموچاو…',faceFound:'دەموچاو دۆزرایەوە ـ ڕەنگەکان لاساییکراون',faceMissing:'دەموچاو نەدۆزرایەوە؛ ڕووناکی زیاد بکە',faceNote:'ڕەنگەکان پلەی گەرمی یان گەرمیی ڕاستەقینە نیشان نادەن.',tempTitle:'تۆماری پێوانەکانی تەرمۆمێتەر',tempHelp:'پلەی گەرمیی پێوراو بە تەرمۆمێتەری ڕاستەقینە بنووسە. کامێرا °C ناپێوێت.',tempLabel:'پلەی گەرمیی پێوراو (°C)',tempSave:'پاشەکەوتکردن',tempClear:'سڕینەوەی تۆمارەکان',tempEmpty:'هیچ پێوانەیەک تۆمار نەکراوە',tempSaved:'پێوانەی تەرمۆمێتەر پاشەکەوت کرا.',tempInvalid:'پێوانەیەک لە نێوان 30 و 45 °C بنووسە.',tempConfirm:'هەموو تۆمارەکان بسڕدرێنەوە؟',faceError:'ناسینەوەی دەموچاو بەردەست نییە: '},
 ar:{faceTitle:'تلوين الوجه بأسلوب حراري',faceToggle:'تمييز الوجه المكتشف (محاكاة فقط)',faceOff:'التعرف على الوجه: متوقف',faceSearching:'جارٍ البحث عن وجه…',faceFound:'تم العثور على وجه — الألوان محاكاة',faceMissing:'لم يُكتشف وجه؛ زِد الإضاءة',faceNote:'الألوان زخرفية ولا تقيس الحرارة.',tempTitle:'سجل قراءات مقياس الحرارة',tempHelp:'أدخل قراءة من مقياس حرارة حقيقي. الكاميرا لا تقيس °C.',tempLabel:'درجة الحرارة المقاسة (°C)',tempSave:'حفظ القراءة',tempClear:'مسح السجل',tempEmpty:'لا توجد قراءات محفوظة',tempSaved:'تم حفظ قراءة مقياس الحرارة.',tempInvalid:'أدخل قراءة بين 30 و45 °C.',tempConfirm:'حذف جميع القراءات المحفوظة؟',faceError:'تعذر اكتشاف الوجه: '}
};
function ft(key){return (faceStrings[lang.value]||faceStrings.en)[key];}
function translateV4(){
 for(const key of ['faceTitle','faceNote','tempTitle','tempHelp','tempLabel','tempSave','tempClear'])$(key).textContent=ft(key);
 $('faceToggleLabel').textContent=ft('faceToggle');
 if(!faceEnabled)$('faceStatus').textContent=ft('faceOff');
 renderTemperatureHistory();
}
async function scanFace(gen){
 if(faceBusy||!stream||video.readyState<2)return;
 faceBusy=true;
 try{
  let bounds=null;
  if('FaceDetector' in window){
   if(!faceDetector)faceDetector=new FaceDetector({fastMode:true,maxDetectedFaces:1});
   const faces=await faceDetector.detect(video);
   if(faces.length)bounds=faces[0].boundingBox;
  }else{
   if(!window.tf)await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
   if(!window.blazeface)await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/blazeface@0.1.0/dist/blazeface.min.js');
   if(!faceModel)faceModel=await blazeface.load();
   faceCtx.drawImage(video,0,0,160,160);
   const faces=await faceModel.estimateFaces(faceCanvas,false);
   if(faces.length){
    const a=faces[0].topLeft,b=faces[0].bottomRight;
    bounds={x:a[0]*video.videoWidth/160,y:a[1]*video.videoHeight/160,width:(b[0]-a[0])*video.videoWidth/160,height:(b[1]-a[1])*video.videoHeight/160};
   }
  }
  if(gen!==cameraGeneration||!faceEnabled)return;
  faceBox=bounds;
  $('faceStatus').textContent=ft(bounds?'faceFound':'faceMissing');
 }catch(e){if(gen===cameraGeneration){faceEnabled=false;$('faceToggle').checked=false;faceBox=null;$('faceStatus').textContent=ft('faceError')+e.message;}}
 finally{faceBusy=false;}
}
function drawFaceOverlay(w,h){
 if(!faceEnabled||!faceBox||!video.videoWidth)return;
 const sx=w/video.videoWidth,sy=h/video.videoHeight;
 const x=faceBox.x*sx,y=faceBox.y*sy,bw=faceBox.width*sx,bh=faceBox.height*sy;
 if(bw<3||bh<3)return;
 ctx.save();
 ctx.beginPath();ctx.ellipse(x+bw/2,y+bh/2,bw*.48,bh*.52,0,0,Math.PI*2);ctx.clip();
 const grad=ctx.createRadialGradient(x+bw*.53,y+bh*.48,1,x+bw*.5,y+bh*.5,Math.max(bw,bh)*.58);
 grad.addColorStop(0,'rgba(255,235,50,.60)');grad.addColorStop(.38,'rgba(255,90,25,.42)');grad.addColorStop(.75,'rgba(145,25,170,.30)');grad.addColorStop(1,'rgba(20,60,230,.10)');
 ctx.fillStyle=grad;ctx.fillRect(x,y,bw,bh);ctx.restore();
 ctx.strokeStyle='#ffd75a';ctx.lineWidth=2;ctx.strokeRect(x,y,bw,bh);
 ctx.fillStyle='#ffecb0';ctx.font='bold 11px sans-serif';ctx.fillText('SIMULATED / NOT °C',Math.max(0,x),Math.max(12,y-5));
}
$('faceToggle').addEventListener('change',()=>{
 faceEnabled=$('faceToggle').checked;faceBox=null;
 $('faceStatus').textContent=faceEnabled?ft('faceSearching'):ft('faceOff');
 if(faceEnabled&&stream){lastFace=0;void scanFace(cameraGeneration);}
});
const TEMP_KEY='pythermal-v4-thermometer-readings';
function getReadings(){try{const data=JSON.parse(localStorage.getItem(TEMP_KEY)||'[]');return Array.isArray(data)?data.filter(x=>Number.isFinite(x.value)&&Number.isFinite(x.time)).slice(0,30):[];}catch(e){return [];}}
function renderTemperatureHistory(){
 const list=$('tempHistory');list.replaceChildren();
 const readings=getReadings();
 if(!readings.length){const li=document.createElement('li');li.textContent=ft('tempEmpty');list.appendChild(li);return;}
 for(const r of readings){const li=document.createElement('li');li.textContent=new Date(r.time).toLocaleString(lang.value==='ar'?'ar-IQ':lang.value==='ku'?'ku':'en')+' — '+r.value.toFixed(1)+' °C';list.appendChild(li);}
}
$('tempForm').addEventListener('submit',e=>{
 e.preventDefault();
 const value=Number($('tempInput').value);
 if(!Number.isFinite(value)||value<30||value>45){$('tempFeedback').textContent=ft('tempInvalid');return;}
 const readings=[{value,time:Date.now()},...getReadings()].slice(0,30);
 try{localStorage.setItem(TEMP_KEY,JSON.stringify(readings));$('tempFeedback').textContent=ft('tempSaved');$('tempInput').value='';renderTemperatureHistory();}
 catch(e){$('tempFeedback').textContent='Storage unavailable: '+e.message;}
});
$('tempClear').addEventListener('click',()=>{if(confirm(ft('tempConfirm'))){try{localStorage.removeItem(TEMP_KEY);}catch(e){}renderTemperatureHistory();}});
lang.addEventListener('change',translateV4);
translateV4();

/* v5: install prompt, offline app shell and accessible camera status. */
let installPrompt=null;
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;const button=document.getElementById('installApp');if(button)button.hidden=false;});
window.addEventListener('appinstalled',()=>{installPrompt=null;const button=document.getElementById('installApp');if(button)button.hidden=true;});
document.getElementById('installApp')?.addEventListener('click',async()=>{
 if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();const button=document.getElementById('installApp');if(button)button.hidden=true;}
 else{document.getElementById('installHelp').hidden=false;}
});
if('serviceWorker' in navigator && (location.protocol==='https:'||location.hostname==='localhost'||location.hostname==='127.0.0.1')){
 window.addEventListener('load',()=>{navigator.serviceWorker.register('./sw.js').catch(err=>console.warn('Offline cache unavailable:',err));});
}
