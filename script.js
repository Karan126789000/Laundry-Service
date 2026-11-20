(function(){
"use strict";
var DAYS=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
var BLOCKS={A:{d:1,p:3},B:{d:2,p:4},C:{d:3,p:5},D:{d:4,p:6}};
var CATS=[["T-shirt",1,"1 point"],["Shirt",1,"1 point"],["Trousers",2,"2 points"],["Shorts",1,"1 point"],["Towel",2,"2 points"],["Hoodie or jacket",3,"3 points"],["Bedsheet",3,"3 points"],["Innerwear or socks (pair)",1,"1 point"]];
var STAFF_PIN="2468";
var st={limit:10,rate:10,receipts:[],block:"",users:[],session:null};
var counts=CATS.map(function(){return 0});
var cur=null;

function load(){try{var r=localStorage.getItem("ldr-v1");if(r){var o=JSON.parse(r);if(o&&typeof o==="object"){st.limit=+o.limit||20;st.receipts=Array.isArray(o.receipts)?o.receipts:[];st.block=BLOCKS[o.block]?o.block:"";st.rate=+o.rate||10;st.users=Array.isArray(o.users)?o.users:[];st.session=(o.session&&o.session.role)?o.session:null}}}catch(e){}}
function save(){try{localStorage.setItem("ldr-v1",JSON.stringify(st))}catch(e){}try{cartN()}catch(e){}}
function $(id){return document.getElementById(id)}
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function nextOn(wd,from){var d=new Date(from);d.setHours(0,0,0,0);while(d.getDay()!==wd)d.setDate(d.getDate()+1);return d}
function fmt(d){return new Date(d).toLocaleDateString("en-IN",{weekday:"short",day:"numeric",month:"short"})}
function fmtT(d){return new Date(d).toLocaleString("en-IN",{weekday:"short",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"})}
function code(n){return "LDR-"+String(n).padStart(4,"0")}

/* routing */
var VIEWS=["plan","dropoff","collect","pay","history","account","staff"];
function route(){var h=location.hash.replace("#","");if(VIEWS.indexOf(h)<0)h="plan";
 VIEWS.forEach(function(v){$("v-"+v).classList.toggle("on",v===h)});
 document.querySelectorAll("nav a").forEach(function(a){if(a.getAttribute("href")==="#"+h)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current")});
 if(h==="staff")renderStaff();if(h==="pay")renderPay();if(h==="history")renderHistory();gate();window.scrollTo(0,0)}
window.addEventListener("hashchange",route);

/* plan */
function renderBlocks(){var w=$("blockBtns");w.innerHTML="";Object.keys(BLOCKS).forEach(function(k){var b=document.createElement("button");b.type="button";b.textContent="Block "+k;b.setAttribute("aria-pressed",st.block===k);b.onclick=function(){st.block=k;save();renderBlocks();renderPlan()};w.appendChild(b)})}
function renderPlan(){var o=$("planOut");if(!st.block){o.innerHTML='<p class="empty">Choose your block to see your days.</p>';return}
 var b=BLOCKS[st.block],now=new Date(),dd=nextOn(b.d,now),pd=nextOn(b.p,new Date(dd.getTime()+864e5)),bk=nextOn(0,new Date(dd.getTime()+864e5));
 o.innerHTML='<div class="days"><div class="day drop"><small>Drop off</small><strong>'+DAYS[b.d]+'</strong><small>Next: '+fmt(dd)+', 4–6 PM</small></div><div class="day pick"><small>Pick up</small><strong>'+DAYS[b.p]+'</strong><small>After that drop-off: '+fmt(pd)+', 4–6 PM</small></div></div><div class="note">Can’t make '+DAYS[b.d]+'? Your backup day is Sunday ('+fmt(bk)+'), 4–6 PM.</div>'}

/* dropoff */
function renderItems(){var w=$("items");w.innerHTML="";CATS.forEach(function(c,i){var r=document.createElement("div");r.className="item";
 r.innerHTML='<div>'+esc(c[0])+'<small>'+c[2]+'</small></div><div class="step"><button type="button" aria-label="Remove one '+esc(c[0])+'">−</button><output aria-live="polite">'+counts[i]+'</output><button type="button" aria-label="Add one '+esc(c[0])+'">+</button></div>';
 var bs=r.querySelectorAll("button");bs[0].onclick=function(){if(counts[i]>0){counts[i]--;update()}};bs[1].onclick=function(){counts[i]++;update()};w.appendChild(r)})}
function totals(){var n=0,p=0;counts.forEach(function(c,i){n+=c;p+=c*CATS[i][1]});return{n:n,p:p}}
function update(){var t=totals();document.querySelectorAll("#items output").forEach(function(o,i){o.textContent=counts[i]});
 $("tItems").textContent=t.n;$("tPts").textContent=t.p;$("tLim").textContent=st.limit;
 var pc=Math.min(100,t.p/st.limit*100),m=$("meter");m.firstElementChild.style.width=pc+"%";var over=t.p>st.limit;m.classList.toggle("over",over);
 var msg=$("limitMsg");$("extraWrap").hidden=!over;if(!over)$("extra").checked=false;
 if(t.n===0){msg.className="note ok";msg.textContent="Add items to see how much of your limit is used."}
 else if(over){msg.className="note bad";msg.textContent="Over the limit by "+(t.p-st.limit)+" points. The extra-load fee would be ₹"+(t.p-st.limit)*st.rate+". Remove items, or ask staff to approve the extra load."}
 else{msg.className="note ok";msg.textContent=(st.limit-t.p)+" points left within your limit."}}
function fillBlockSel(){var s=$("dBlock");s.innerHTML='<option value="">Choose block</option>'+Object.keys(BLOCKS).map(function(k){return '<option value="'+k+'">Block '+k+'</option>'}).join("");$("crB").innerHTML=s.innerHTML;if(st.block)s.value=st.block}
$("clear").onclick=function(){counts=CATS.map(function(){return 0});$("slipOut").innerHTML="";update()};
$("issue").onclick=function(){var t=totals(),room=$("room").value.trim(),bl=$("dBlock").value,out=$("slipOut");
 var err=!st.session?"Sign in on the Account page first, so the receipt is linked to you.":t.n===0?"Add at least one item before issuing a receipt.":!room?"Enter a name or room number.":!bl?"Choose your block.":(t.p>st.limit&&!$("extra").checked)?"Load is over the limit. Remove items or tick the staff-approved box.":"";
 if(err){out.innerHTML='<div class="note bad" role="alert">'+esc(err)+'</div>';return}
 var max=st.receipts.reduce(function(a,r){return Math.max(a,r.n)},0),now=new Date(),pd=nextOn(BLOCKS[bl].p,new Date(now.getTime()+864e5));pd.setHours(16,0,0,0);
 var lines=[];counts.forEach(function(c,i){if(c)lines.push(c+" "+CATS[i][0].toLowerCase())});
 var r={n:max+1,room:room,block:bl,at:now.getTime(),pickup:pd.getTime(),items:t.n,points:t.p,limit:st.limit,extra:t.p>st.limit,note:$("stain").value.trim(),lines:lines.join(", "),status:"dropped",user:(st.session&&st.session.role==="student")?st.session.u:"",fee:(t.p>st.limit)?(t.p-st.limit)*st.rate:0,paid:t.p<=st.limit};
 st.receipts.push(r);save();out.innerHTML=slip(r);
 counts=CATS.map(function(){return 0});$("room").value="";$("stain").value="";applySession();update();
 $("pr").onclick=function(){window.print()};out.scrollIntoView({behavior:"smooth",block:"start"})};
function slip(r){return '<div class="slip" id="slip"><div>Student copy: keep this slip</div><div class="no">'+code(r.n)+'</div><dl><dt>Name or room</dt><dd>'+esc(r.room)+' (Block '+r.block+')</dd><dt>Dropped off</dt><dd>'+fmtT(r.at)+'</dd><dt>Pick up</dt><dd>'+fmt(r.pickup)+', 4–6 PM</dd><dt>Items</dt><dd>'+r.items+' ('+esc(r.lines)+')</dd><dt>Points</dt><dd>'+r.points+' of '+r.limit+(r.extra?' (extra load approved)':'')+'</dd>'+(r.fee?'<dt>Extra-load fee</dt><dd>₹'+r.fee+(r.paid?' (paid)':' (unpaid: pay on the Pay page)')+'</dd>':'')+(r.note?'<dt>Note</dt><dd>'+esc(r.note)+'</dd>':'')+'</dl><div class="row no-print"><button class="btn dark" id="pr" type="button">Print or save slip</button></div></div>'}

/* collect */
function find(){var v=$("rno").value.trim().toUpperCase().replace("LDR-","").replace(/^0+/,""),n=parseInt(v,10),m=$("findMsg");
 cur=st.receipts.filter(function(r){return r.n===n})[0]||null;$("reForm").hidden=true;
 if(!cur){$("collectBox").hidden=true;m.innerHTML='<div class="note bad" role="alert">No receipt found with that number. Check the slip, or ask staff to look it up by room.</div>';return}
 m.innerHTML="";$("collectBox").hidden=false;$("cTitle").textContent=code(cur.n)+" · "+cur.room;
 $("cSub").textContent=cur.items+" items handed in on "+fmt(cur.at)+" ("+cur.lines+")."+(cur.status==="accepted"?" Already accepted.":cur.status==="rewash"?" Re-wash requested.":"");
 $("back").value="";document.querySelectorAll(".q").forEach(function(q){q.checked=false});$("cMsg").innerHTML=""}
$("find").onclick=find;$("rno").addEventListener("keydown",function(e){if(e.key==="Enter")find()});
$("accept").onclick=function(){var q=[].slice.call(document.querySelectorAll(".q")),all=q.every(function(x){return x.checked}),b=$("back").value;
 if(b===""||+b!==cur.items){$("cMsg").innerHTML='<div class="note bad" role="alert">You counted '+(b===""?"no items":b)+', but the receipt says '+cur.items+'. Recount, or tell staff before you leave.</div>';return}
 if(!all){$("cMsg").innerHTML='<div class="note bad" role="alert">Tick every check before accepting. If something is wrong, use “Request re-wash”.</div>';return}
 cur.status="accepted";cur.doneAt=Date.now();save();$("cMsg").innerHTML='<div class="note ok">Accepted. Enjoy your clean clothes.</div>';$("cSub").textContent="Accepted on "+fmtT(cur.doneAt)+"."};
$("reBtn").onclick=function(){$("reForm").hidden=false;$("reItems").focus()};
$("reSend").onclick=function(){var it=$("reItems").value.trim(),is=$("reIssue").value.trim();
 if(!it||!is){$("cMsg").innerHTML='<div class="note bad" role="alert">Say which items and what is wrong, so staff know what to fix.</div>';return}
 var now=Date.now();cur.status="rewash";cur.re={items:it,issue:is,at:now,due:now+864e5};save();$("reForm").hidden=true;
 $("cMsg").innerHTML='<div class="note ok"><b>Re-wash confirmed.</b> '+esc(it)+' will be re-washed by <b>'+fmtT(cur.re.due)+'</b>. Keep this screen or your slip as confirmation.</div>';$("reItems").value="";$("reIssue").value=""};

/* staff */
function renderStaff(){var R=st.receipts,rw=R.filter(function(r){return r.status==="rewash"}),open=R.filter(function(r){return r.status==="dropped"}),acc=R.filter(function(r){return r.status==="accepted"});
 $("stats").innerHTML=[["Receipts",R.length],["Waiting for pickup",open.length],["Re-wash open",rw.length],["Accepted",acc.length]].map(function(s){return '<div class="stat"><b>'+s[1]+'</b>'+s[0]+'</div>'}).join("");
 $("rwTable").innerHTML=rw.length?'<table><thead><tr><th>Receipt</th><th>Room</th><th>Items</th><th>Issue</th><th>Due by</th><th></th></tr></thead><tbody>'+rw.map(function(r){var late=Date.now()>r.re.due;return '<tr><td>'+code(r.n)+'</td><td>'+esc(r.room)+'</td><td>'+esc(r.re.items)+'</td><td>'+esc(r.re.issue)+'</td><td>'+fmtT(r.re.due)+(late?' <span class="pill rewash">late</span>':'')+'</td><td><button class="btn alt" data-done="'+r.n+'">Mark returned</button></td></tr>'}).join("")+'</tbody></table>':'<p class="empty">No re-wash requests right now.</p>';
 $("allTable").innerHTML=R.length?'<table><thead><tr><th>Receipt</th><th>Room</th><th>Block</th><th>Items</th><th>Points</th><th>Pickup</th><th>Fee</th><th>Status</th></tr></thead><tbody>'+R.slice().reverse().map(function(r){var lab=r.status==="dropped"?"Waiting":r.status==="accepted"?"Accepted":"Re-wash";return '<tr><td>'+code(r.n)+'</td><td>'+esc(r.room)+'</td><td>'+r.block+'</td><td>'+r.items+'</td><td>'+r.points+(r.extra?' (extra)':'')+'</td><td>'+fmt(r.pickup)+'</td><td>'+(r.fee?'₹'+r.fee+(r.paid?' paid':' due'):'-')+'</td><td><span class="pill '+r.status+'">'+lab+'</span></td></tr>'}).join("")+'</tbody></table>':'<p class="empty">No receipts yet. Issue one from the Drop off page.</p>';
 document.querySelectorAll("[data-done]").forEach(function(b){b.onclick=function(){var r=st.receipts.filter(function(x){return x.n===+b.dataset.done})[0];if(r){r.status="accepted";r.doneAt=Date.now();save();renderStaff()}}});
 $("limIn").value=st.limit;renderFees()}
$("limIn").onchange=function(){var v=parseInt(this.value,10);if(v>0){st.limit=v;save();update()}else this.value=st.limit};
$("wipe").onclick=function(){if(confirm("Delete all receipts saved in this browser?")){st.receipts=[];save();renderStaff()}};

/* accounts */
function userOf(id){return st.users.filter(function(x){return x.id===id})[0]||null}
function isStaff(){return !!(st.session&&st.session.role==="staff")}
function bad(m,t){m.innerHTML='<div class="note bad" role="alert">'+esc(t)+'</div>'}
function mine(){var s=st.session;if(!s)return[];return s.role==="staff"?st.receipts:st.receipts.filter(function(r){return r.user===s.u})}
function gate(){var s=isStaff(),g=$("staffGate");g.hidden=s;[].forEach.call($("v-staff").children,function(el){if(el!==g&&el.tagName!=="H2"&&el.className!=="lead")el.hidden=!s})}
function applySession(){var s=st.session,u=s&&s.role==="student"?userOf(s.u):null;
 if(s&&s.role==="student"&&!u){st.session=s=null;save()}
 $("who").innerHTML=s?"<small>Hello, "+esc(s.role==="staff"?"staff":u.name.split(" ")[0])+"</small><b>Account</b>":"<small>Hello, sign in</small><b>Account</b>";cartN();
 $("accForms").hidden=!!s;var o=$("accOut");o.hidden=!s;
 if(s){var d=s.role==="staff"?"You can use the Staff desk.":"ID "+esc(u.id)+", room "+esc(u.room)+", Block "+esc(u.block)+".";
  o.innerHTML="<h3>"+esc(s.role==="staff"?"Laundry staff":u.name)+"</h3><p style='margin:0'>"+d+"</p><div class='row'><button class='btn alt' id='out' type='button'>Sign out</button></div>";
  $("out").onclick=function(){st.session=null;save();applySession();renderPay();renderHistory()}}
 if(u){$("room").value=u.room;$("dBlock").value=u.block;if(!st.block){st.block=u.block;renderBlocks();renderPlan()}}
 gate()}
$("liGo").onclick=function(){var id=$("liU").value.trim().toLowerCase(),p=$("liP").value,m=$("liMsg");
 if(id==="staff"){if(p!==STAFF_PIN)return bad(m,"Wrong staff PIN.");st.session={role:"staff",u:"staff"}}
 else{var u=userOf(id);if(!u||u.pin!==p)return bad(m,"ID or PIN not recognised. Check them, or create an account.");st.session={role:"student",u:u.id}}
 save();$("liP").value="";m.innerHTML="";applySession()};
$("crGo").onclick=function(){var n=$("crN").value.trim(),id=$("crU").value.trim().toLowerCase(),r=$("crR").value.trim(),b=$("crB").value,p=$("crP").value,m=$("crMsg");
 if(!n||!id||!r||!b)return bad(m,"Fill in your name, student ID, room and block.");
 if(id==="staff")return bad(m,"That ID is reserved. Choose another.");
 if(!/^\d{4,6}$/.test(p))return bad(m,"PIN must be 4 to 6 digits.");
 if(userOf(id))return bad(m,"That student ID already has an account. Sign in instead.");
 st.users.push({id:id,name:n,room:r,block:b,pin:p});st.session={role:"student",u:id};save();m.innerHTML="";
 ["crN","crU","crR","crP"].forEach(function(x){$(x).value=""});applySession()};

/* payments */
function renderPay(msg){var o=$("payList"),s=st.session;$("payMsg").innerHTML=msg||"";
 if(!s||s.role!=="student"){o.innerHTML='<p class="empty">Sign in as a student on the <a href="#account">Account page</a> to see your fees.</p>';return}
 var L=mine().filter(function(r){return r.fee&&!r.paid});
 if(!L.length){o.innerHTML='<p class="empty">Nothing to pay. A fee appears here when a load goes over the limit.</p>';return}
 o.innerHTML=L.map(function(r){return '<div class="item" style="flex-wrap:wrap"><div><b>'+code(r.n)+'</b>: ₹'+r.fee+'<small>'+(r.pending?'Cash promised. Pay at the counter and staff will confirm.':'Over the limit by '+(r.points-r.limit)+' points')+'</small></div>'+(r.pending?'':'<div class="row" style="margin:0"><select aria-label="Payment method for '+code(r.n)+'" data-m="'+r.n+'" style="width:auto"><option value="upi">UPI (demo)</option><option value="cash">Cash at counter</option></select><input type="text" data-ref="'+r.n+'" placeholder="UPI reference (optional)" aria-label="UPI reference" style="width:190px"><button class="btn" data-pay="'+r.n+'" type="button">Pay ₹'+r.fee+'</button></div>')+'</div>'}).join("");
 document.querySelectorAll("[data-pay]").forEach(function(b){b.onclick=function(){var n=b.dataset.pay,r=st.receipts.filter(function(x){return x.n===+n})[0],me=document.querySelector('[data-m="'+n+'"]').value;if(!r)return;
  if(me==="upi"){r.paid=true;r.method="UPI";r.ref=document.querySelector('[data-ref="'+n+'"]').value.trim();r.paidAt=Date.now();save();renderPay('<div class="note ok">Demo payment recorded for '+code(r.n)+': ₹'+r.fee+' by UPI.</div>')}
  else{r.pending=true;r.method="Cash";save();renderPay('<div class="note">Pay ₹'+r.fee+' at the counter. Staff will confirm it on the Staff desk.</div>')}}})}
function renderFees(){var L=st.receipts.filter(function(r){return r.fee&&!r.paid});
 $("feeTable").innerHTML=L.length?'<table><thead><tr><th>Receipt</th><th>Room</th><th>Fee</th><th>Payment</th><th></th></tr></thead><tbody>'+L.map(function(r){return '<tr><td>'+code(r.n)+'</td><td>'+esc(r.room)+'</td><td>₹'+r.fee+'</td><td>'+(r.pending?'Cash promised':'Not paid')+'</td><td><button class="btn alt" data-cash="'+r.n+'" type="button">Confirm payment received</button></td></tr>'}).join("")+'</tbody></table>':'<p class="empty">No unpaid fees.</p>';
 document.querySelectorAll("[data-cash]").forEach(function(b){b.onclick=function(){var r=st.receipts.filter(function(x){return x.n===+b.dataset.cash})[0];if(r){r.paid=true;r.pending=false;r.method=r.method||"Cash";r.paidAt=Date.now();save();renderStaff()}}})}

/* history */
function renderHistory(){var s=st.session,hs=$("hStats"),ht=$("hTable");
 if(!s){hs.innerHTML="";ht.innerHTML='<p class="empty">Sign in on the <a href="#account">Account page</a> to see your history.</p>';return}
 var L=mine(),paid=0,due=0,rw=0;L.forEach(function(r){if(r.fee){if(r.paid)paid+=r.fee;else due+=r.fee}if(r.re)rw++});
 hs.innerHTML=[["Loads",L.length],["Re-washes",rw],["Fees paid","₹"+paid],["Fees due","₹"+due]].map(function(x){return '<div class="stat"><b>'+x[1]+'</b>'+x[0]+'</div>'}).join("");
 ht.innerHTML=L.length?'<table><thead><tr><th>Receipt</th><th>Dropped off</th><th>Items</th><th>Status</th><th>Fee</th><th>Details</th></tr></thead><tbody>'+L.slice().reverse().map(function(r){var lab=r.status==="dropped"?"Waiting for pickup":r.status==="accepted"?"Accepted":"Re-wash";return '<tr><td>'+code(r.n)+'</td><td>'+fmt(r.at)+'</td><td>'+r.items+' ('+r.points+' pts)</td><td><span class="pill '+r.status+'">'+lab+'</span></td><td>'+(r.fee?'₹'+r.fee+(r.paid?' paid ('+esc(r.method||"")+')':r.pending?' cash pending':' due'):'-')+'</td><td>'+(r.re?'Re-wash: '+esc(r.re.items)+', due '+fmtT(r.re.due):r.doneAt?'Collected '+fmt(r.doneAt):'Pickup '+fmt(r.pickup))+'</td></tr>'}).join("")+'</tbody></table>':'<p class="empty">No loads yet. Your first drop-off will show up here.</p>'}

function cartN(){$("cartN").textContent=mine().filter(function(r){return r.fee&&!r.paid}).length}
$("srch").onsubmit=function(e){e.preventDefault();var v=$("sq").value.trim();if(!v)return;$("rno").value=v;location.hash="#collect";find();$("sq").value=""};
load();renderBlocks();renderPlan();fillBlockSel();renderItems();update();applySession();route();
})();
