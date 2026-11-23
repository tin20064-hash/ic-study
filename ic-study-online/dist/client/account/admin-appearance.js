(() => {
 const boot=window.IC_ADMIN_LOOK;
 if(!boot)return;

 const lookKey='on-tap-anime-look-v2:'+boot.userId;
 function read(key){
  try{return JSON.parse(localStorage.getItem(key))}catch{return null}
 }
 function apply(look){
  const theme=document.documentElement.dataset;
  theme.palette=boot.palettes.includes(look?.palette)?look.palette:'sakura';
  theme.glass=look?.glass===true?'on':'off';
 }

 const pending=read('ic-sync:'+boot.userId)?.dirty?read('on-tap-anime-v1:'+boot.userId)?.accountLook:null;
 apply({...read(lookKey),...boot.look,...pending});
 window.addEventListener('storage',event=>{
  if(event.key===lookKey)apply(read(lookKey)??boot.look);
 });
})();
