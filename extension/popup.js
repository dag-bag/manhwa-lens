'use strict';
const language=document.getElementById('language');
const status=document.getElementById('status');
const controls=[...document.querySelectorAll('button,select')];
const languages=new Set(['kor','jpn','chi_sim','eng']);
function report(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
function busy(value){controls.forEach(control=>control.disabled=value);}
async function activeTab(){const [tab]=await chrome.tabs.query({active:true,currentWindow:true});if(!tab?.id)throw new Error('No active tab found.');return tab;}
async function start(mode){busy(true);report('Opening selection on this page…');try{await chrome.storage.local.set({language:language.value});const tab=await activeTab();const response=await chrome.runtime.sendMessage({type:'START',mode,language:language.value,tabId:tab.id});if(!response?.ok)throw new Error(response?.error||'Could not start selection. Open a regular website and try again.');window.close();}catch(error){report(error.message||String(error),true);}finally{busy(false);}}
document.getElementById('region').addEventListener('click',()=>start('region'));
document.getElementById('image').addEventListener('click',()=>start('image'));
language.addEventListener('change',async()=>{try{await chrome.storage.local.set({language:language.value});}catch(error){report('Could not save the language: '+error.message,true);}});
document.getElementById('clear').addEventListener('click',async()=>{busy(true);try{const tab=await activeTab();const response=await chrome.runtime.sendMessage({type:'CLEAR',tabId:tab.id});if(!response?.ok)throw new Error(response?.error||'Could not clear translations.');report('Page translations removed.');}catch(error){report(error.message||String(error),true);}finally{busy(false);}});
(async()=>{busy(true);try{const saved=await chrome.storage.local.get('language');language.value=languages.has(saved.language)?saved.language:'kor';}catch(error){report('Using Korean. Saved preferences could not be read.',true);}finally{busy(false);}})();
