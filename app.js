'use strict';
const euro = new Intl.NumberFormat('el-GR', {style:'currency',currency:'EUR'});
const num = new Intl.NumberFormat('el-GR', {maximumFractionDigits:2});
const $ = id => document.getElementById(id);
const tool = document.body.dataset.tool;
function read(id) {
  const element = $(id);
  if (!element || element.value.trim() === '') return {ok:false,empty:true};
  const value = Number(element.value);
  return {ok:Number.isFinite(value) && !element.validity.badInput, value};
}
function formatResult(id,value,kind='euro') {
  const element = $(id);
  if (!element) return;
  element.textContent = Number.isFinite(value) ? (kind==='euro'?euro.format(value):kind==='pct'?num.format(value)+'%':num.format(value)) : '—';
}
function clearResults() {document.querySelectorAll('[data-result]').forEach(el=>el.textContent='—');}
function monthsFromYears(years,maxYears) {
  const months=years*12;
  return years>0 && years<=maxYears && Number.isInteger(months) ? months : null;
}
function calculate() {
  const ids = ({savings:['initial','monthly','years','rate'],compound:['initial','monthly','years','rate'],loan:['principal','rate','years'],budget:['income','housing','food','other'],change:['before','after']})[tool];
  if (!ids) return;
  const inputs = Object.fromEntries(ids.map(id=>[id,read(id)]));
  let error = '';
  if (ids.some(id=>inputs[id].empty)) error='Συμπλήρωσε όλα τα πεδία για να εμφανιστεί το αποτέλεσμα.';
  else if (ids.some(id=>!inputs[id].ok)) error='Πληκτρολόγησε έγκυρους αριθμούς σε όλα τα πεδία.';
  else {
    const v=id=>inputs[id].value;
    if (tool==='savings' || tool==='compound') {
      const [initial,monthly,years,rate]=ids.map(v);
      const months=monthsFromYears(years,60);
      if(initial<0||initial>1e8||monthly<0||monthly>1e8||rate<0||rate>30||months===null) error='Χρησιμοποίησε μη αρνητικά ποσά έως 100.000.000€, διάρκεια 1–60 έτη σε ακέραιους μήνες και επιτόκιο 0–30%.';
      else {
        const monthlyRate=rate/1200;
        let balance=initial;
        for(let i=0;i<months;i++) balance=balance*(1+monthlyRate)+monthly;
        const contributions=initial+months*monthly;
        if(!Number.isFinite(balance)) error='Το αποτέλεσμα υπερβαίνει τα επιτρεπτά αριθμητικά όρια.';
        else {
          formatResult('total',balance);
          formatResult('deposits',contributions);
          formatResult('interest',balance-contributions);
          formatResult('months',months,'number');
        }
      }
    } else if(tool==='loan') {
      const [principal,rate,years]=ids.map(v);
      const months=monthsFromYears(years,40);
      if(principal<=0||principal>1e8||rate<0||rate>40||months===null) error='Δώσε ποσό μεγαλύτερο από 0 και έως 100.000.000€, επιτόκιο 0–40% και διάρκεια έως 40 έτη σε ακέραιους μήνες.';
      else {
        const i=rate/1200;
        const payment=i===0?principal/months:principal*i/(-Math.expm1(-months*Math.log1p(i)));
        const paid=payment*months;
        if(!Number.isFinite(paid)) error='Αδύνατος ο υπολογισμός για αυτές τις τιμές.';
        else {formatResult('total',payment);formatResult('paid',paid);formatResult('interest',Math.max(0,paid-principal));}
      }
    } else if(tool==='budget') {
      const [income,housing,food,other]=ids.map(v);
      if([income,housing,food,other].some(n=>n<0||n>1e8)) error='Τα ποσά πρέπει να είναι από 0 έως 100.000.000€.';
      else {
        const expenses=housing+food+other;
        formatResult('total',income-expenses);
        formatResult('expenses',expenses);
        if(income===0) {
          formatResult('share',NaN,'pct');
          if(expenses>0) error='Το ποσοστό εξόδων δεν ορίζεται όταν το εισόδημα είναι 0€. Το υπόλοιπο και τα έξοδα υπολογίστηκαν κανονικά.';
          else error='Το ποσοστό 0€ / 0€ δεν ορίζεται. Το υπόλοιπο και τα έξοδα υπολογίστηκαν κανονικά.';
        } else formatResult('share',expenses/income*100,'pct');
      }
    } else if(tool==='change') {
      const before=v('before'),after=v('after');
      if(Math.abs(before)>1e8||Math.abs(after)>1e8) error='Οι τιμές πρέπει να βρίσκονται μεταξύ −100.000.000 και 100.000.000.';
      else if(before===0) {
        formatResult('difference',after-before);
        error='Η ποσοστιαία μεταβολή δεν ορίζεται όταν η αρχική τιμή είναι 0. Η απόλυτη διαφορά εμφανίζεται κανονικά.';
      } else {
        formatResult('total',(after-before)/Math.abs(before)*100,'pct');
        formatResult('difference',after-before);
      }
    }
  }
  if(error && !(tool==='budget' && ids.every(id=>inputs[id].ok) && inputs.income.value===0 && [inputs.housing.value,inputs.food.value,inputs.other.value].every(x=>x>=0&&x<=1e8)) && !(tool==='change' && inputs.before.ok && inputs.after.ok && inputs.before.value===0)) clearResults();
  const errorEl=$('error'); if(errorEl) errorEl.textContent=error;
}
if(tool){document.querySelectorAll('input').forEach(el=>el.addEventListener('input',calculate));calculate();}
document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
