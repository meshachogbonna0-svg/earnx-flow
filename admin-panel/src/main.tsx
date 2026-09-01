import React,{useEffect,useMemo,useState} from "react";
import {createRoot} from "react-dom/client";
import {createClient} from "@supabase/supabase-js";
import {ShieldCheck,LogOut,Save,Users,Wallet,Settings,Video,ClipboardList,Wrench,Landmark,Megaphone,Gift,RefreshCw,Search,CheckCircle2} from "lucide-react";
import "./styles.css";

const url=import.meta.env.VITE_SUPABASE_URL as string|undefined;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined;
const supabase=url&&key?createClient(url,key):null;

type AnyRow=Record<string,any>;
const money=(n:any)=>`₦${Number(n||0).toLocaleString("en-NG")}`;

function App(){
 const [loading,setLoading]=useState(true),[allowed,setAllowed]=useState(false),[session,setSession]=useState<any>(null);
 const [section,setSection]=useState("overview"),[settings,setSettings]=useState<AnyRow>({});
 const [levels,setLevels]=useState<AnyRow[]>([]),[videos,setVideos]=useState<AnyRow[]>([]),[questionnaires,setQuestionnaires]=useState<AnyRow[]>([]);
 const [users,setUsers]=useState<AnyRow[]>([]),[search,setSearch]=useState(""),[saving,setSaving]=useState(false),[message,setMessage]=useState("");

 useEffect(()=>{void boot()},[]);
 async function boot(){
  if(!supabase){setMessage("Missing Supabase configuration.");setLoading(false);return}
  const {data:{session}}=await supabase.auth.getSession();
  if(!session){setLoading(false);return}
  setSession(session);
  const {data:ok,error}=await supabase.rpc("ensure_admin_role");
  if(error||ok!==true){setMessage(error?.message||"This account does not have admin access.");setLoading(false);return}
  const [{data:s},{data:lv},{data:vid},{data:qs},{data:us}]=await Promise.all([
   supabase.from("platform_settings").select("*").maybeSingle(),
   supabase.from("levels").select("*").order("level"),
   supabase.from("videos").select("*").order("created_at",{ascending:false}).limit(100),
   supabase.from("questionnaires").select("*").order("sort_order"),
   supabase.from("profiles").select("id,username,first_name,email,balance,pending_balance,level,activation,account_status,total_earned,total_withdrawn").order("created_at",{ascending:false}).limit(200)
  ]);
  const next={...(s||{})}; next.supported_banks_text=Array.isArray(next.supported_banks)?next.supported_banks.join(", "):"";
  setSettings(next);setLevels(lv||[]);setVideos(vid||[]);setQuestionnaires(qs||[]);setUsers(us||[]);setAllowed(true);setLoading(false);
 }
 async function saveSettings(){
  if(!supabase)return;setSaving(true);
  const payload={...settings}; payload.supported_banks=String(payload.supported_banks_text||"").split(",").map(x=>x.trim()).filter(Boolean);delete payload.supported_banks_text;
  const {data,error}=await supabase.rpc("admin_update_platform_settings",{_settings:payload});
  setSaving(false);setMessage(error?.message||((data as any)?.ok?"Settings saved successfully.":"Settings could not be saved."));
 }
 async function saveLevel(l:AnyRow){
  if(!supabase)return;
  const {error}=await supabase.from("levels").update({
   name:l.name,upgrade_price:Number(l.upgrade_price),reward_per_tap:Number(l.reward_per_tap),
   battery_capacity:Number(l.battery_capacity),daily_tap_limit:Number(l.daily_tap_limit),
   daily_earnings_limit:Number(l.daily_earnings_limit),daily_recharge_limit:Number(l.daily_recharge_limit),
   max_withdrawal:Number(l.max_withdrawal),min_withdrawal:Number(l.min_withdrawal),
   daily_withdrawal_limit:Number(l.daily_withdrawal_limit),max_withdrawals_per_day:Number(l.max_withdrawals_per_day),
   unlimited_battery:!!l.unlimited_battery,benefits:l.benefits
  }).eq("level",l.level);
  setMessage(error?.message||`Level ${l.level} saved.`);
 }
 async function saveVideo(v:AnyRow){
  if(!supabase)return;
  const {error}=await supabase.from("videos").update({title:v.title,url:v.url,reward:Number(v.reward),active:v.active,watch_time:Number(v.watch_time||0)}).eq("id",v.id);
  setMessage(error?.message||"Video saved.");
 }
 const filteredUsers=useMemo(()=>users.filter(u=>JSON.stringify(u).toLowerCase().includes(search.toLowerCase())),[users,search]);
 const nav=[
  ["overview",Users,"Overview"],["users",Users,"Users"],["levels",Settings,"Levels & Rewards"],
  ["withdrawals",Wallet,"Withdrawals"],["activation",Gift,"Activation & Upgrade"],
  ["bonus",Gift,"Welcome Bonus"],["questionnaire",ClipboardList,"Questionnaires"],
  ["banners",Megaphone,"Banners & Promotions"],["videos",Video,"Videos"],
  ["banks",Landmark,"Bank & Payout"],["maintenance",Wrench,"Maintenance"]
 ];
 const set=(k:string,v:any)=>setSettings((x:any)=>({...x,[k]:v}));
 const field=(label:string,key:string,type="text")=><label><span>{label}</span><input type={type} value={settings[key]??""} onChange={e=>set(key,type==="number"?Number(e.target.value):e.target.value)}/></label>;
 if(loading)return <div className="center">Loading EarnX Admin…</div>;
 if(!session)return <div className="center"><div className="login card"><ShieldCheck/><h1>EarnX Control Center</h1><p>Administrator sign-in</p><button onClick={async()=>{const email=prompt("Admin email");const password=prompt("Admin password");if(email&&password){const {error}=await supabase!.auth.signInWithPassword({email,password});if(error)setMessage(error.message);else void boot()}}}>Sign in</button>{message&&<small>{message}</small>}</div></div>;
 if(!allowed)return <div className="center"><div className="card"><ShieldCheck/><h2>Access denied</h2><p>{message}</p></div></div>;

 return <div className="app">
  <aside><div className="brand"><ShieldCheck/> <span>EarnX<br/><small>Control Center</small></span></div>
   {nav.map(([id,I,label])=><button key={id as string} className={section===id?"active":""} onClick={()=>setSection(id as string)}><I/><span>{label}</span></button>)}
   <button onClick={()=>void boot()}><RefreshCw/><span>Refresh data</span></button>
   <button className="logout" onClick={()=>supabase?.auth.signOut().then(()=>location.reload())}><LogOut/><span>Sign out</span></button>
  </aside>
  <main><header><div><h1>{nav.find(n=>n[0]===section)?.[2]}</h1><p>Everything important in your EarnX platform, in one place.</p></div>{["overview","users"].includes(section)?null:<button className="save" onClick={()=>void saveSettings()} disabled={saving}><Save/>{saving?"Saving…":"Save changes"}</button>}</header>
  {message&&<div className="notice">{message}</div>}

  {section==="overview"&&<><div className="stats"><div className="card"><Users/><b>{users.length}</b><span>Loaded users</span></div><div className="card"><Wallet/><b>{money(users.reduce((a,u)=>a+Number(u.balance||0),0))}</b><span>Total visible balance</span></div><div className="card"><Gift/><b>{money(settings.questionnaire_bonus)}</b><span>Configured welcome reward</span></div><div className="card"><Settings/><b>0–7</b><span>Level controls</span></div></div><div className="grid"><div className="card"><CheckCircle2/><h3>Platform controls</h3><p>Welcome bonus, questionnaires, banners, withdrawals, activation, upgrades and maintenance are separated into dedicated sections.</p></div><div className="card"><Megaphone/><h3>Promotion center</h3><p>Manage banner text, CTA and promotion messaging from the Banners section.</p></div></div></>}

  {section==="users"&&<div className="card"><div className="toolbar"><div className="search"><Search/><input placeholder="Search username, name or email…" value={search} onChange={e=>setSearch(e.target.value)}/></div></div><div className="table"><div className="tr head"><b>User</b><b>Level</b><b>Balance</b><b>Status</b></div>{filteredUsers.map(u=><div className="tr" key={u.id}><span><strong>{u.username||u.first_name||"User"}</strong><small>{u.email||""}</small></span><span>L{u.level??0}</span><span>{money(u.balance)}</span><span>{u.account_status||"—"} / {u.activation||"—"}</span></div>)}</div></div>}

  {section==="levels"&&<div className="grid">{levels.map((l,i)=><div className="card form" key={l.level}><h3>Level {l.level} · {l.name||""}</h3>{[
   ["name","Name","text"],["upgrade_price","Upgrade price","number"],["reward_per_tap","Reward per tap","number"],
   ["battery_capacity","Battery capacity","number"],["daily_tap_limit","Daily tap limit","number"],["daily_earnings_limit","Daily earnings limit","number"],
   ["daily_recharge_limit","Daily recharge limit","number"],["min_withdrawal","Minimum withdrawal","number"],["max_withdrawal","Maximum withdrawal (0 = unlimited)","number"],
   ["daily_withdrawal_limit","Daily withdrawal amount limit (0 = unlimited)","number"],["max_withdrawals_per_day","Maximum withdrawals/day (0 = unlimited)","number"]
  ].map(([k,label,type])=><label key={k}><span>{label}</span><input type={type} value={l[k]??""} onChange={e=>setLevels(xs=>xs.map((x,j)=>j===i?{...x,[k]:type==="number"?Number(e.target.value):e.target.value}:x))}/></label>)}<label className="check"><input type="checkbox" checked={!!l.unlimited_battery} onChange={e=>setLevels(xs=>xs.map((x,j)=>j===i?{...x,unlimited_battery:e.target.checked}:x))}/> Unlimited battery</label><label><span>Benefits (one per line)</span><textarea value={(l.benefits||[]).join("\n")} onChange={e=>setLevels(xs=>xs.map((x,j)=>j===i?{...x,benefits:e.target.value.split(/\n+/).filter(Boolean)}:x))}/></label><button className="save" onClick={()=>void saveLevel(l)}>Save Level {l.level}</button></div>)}</div>}

  {section==="withdrawals"&&<div className="card form">{field("Minimum withdrawal","min_withdrawal","number")}{field("Maximum withdrawal","max_withdrawal","number")}{field("Daily withdrawal limit","withdrawal_daily_limit","number")}{field("Maximum withdrawals per day","max_withdrawals_per_day","number")}{field("Processing time","withdrawal_processing_time")}<label className="check"><input type="checkbox" checked={settings.withdrawals_enabled!==false} onChange={e=>set("withdrawals_enabled",e.target.checked)}/> Withdrawals enabled</label><label className="check"><input type="checkbox" checked={settings.withdrawal_requires_activation!==false} onChange={e=>set("withdrawal_requires_activation",e.target.checked)}/> Require activation before withdrawal</label></div>}

  {section==="activation"&&<div className="card form">{field("Activation price","activation_price","number")}{field("Activation processing time","activation_processing_time")}<p className="hint">Activation remains a one-time bank-transfer flow. Keep payment instructions consistent with your real payout account.</p>{field("Upgrade processing time","upgrade_processing_time")}</div>}

  {section==="bonus"&&<div className="card form"><h3>Welcome Bonus</h3>{field("Welcome bonus amount","welcome_bonus","number")}{field("Bonus condition / requirement","questionnaire_bonus_condition")}<label className="check"><input type="checkbox" checked={settings.questionnaire_bonus_enabled!==false} onChange={e=>set("welcome_bonus_enabled",e.target.checked)}/> Enable welcome bonus</label><p className="hint">The amount configured here is the amount the claim flow must use; there is no hard-coded ₦1,000/₦150,000 fallback in this panel.</p></div>}

  {section==="questionnaire"&&<div className="grid">{questionnaires.map((q,i)=><div className="card form" key={q.id}><h3>{q.title}</h3><label><span>Title</span><input value={q.title||""} onChange={e=>setQuestionnaires(xs=>xs.map((x,j)=>j===i?{...x,title:e.target.value}:x))}/></label><label><span>Description</span><textarea value={q.description||""} onChange={e=>setQuestionnaires(xs=>xs.map((x,j)=>j===i?{...x,description:e.target.value}:x))}/></label><label><span>Reward</span><input type="number" value={q.reward??0} onChange={e=>setQuestionnaires(xs=>xs.map((x,j)=>j===i?{...x,reward:Number(e.target.value)}:x))}/></label><button className="save" onClick={async()=>{const {error}=await supabase!.from("questionnaires").update({title:q.title,description:q.description,reward:Number(q.reward)}).eq("id",q.id);setMessage(error?.message||"Questionnaire saved.")}}>Save questionnaire</button><p className="hint">Use choice/dropdown/boolean types for questions where users should select an answer. Keep postal code and other free-form fields as short text.</p></div>)}</div>}

  {section==="banners"&&<div className="card form"><h3>Banner & Promotion Center</h3>{field("Main banner title","banner_title")}{field("Main banner subtitle","banner_subtitle")}{field("Banner CTA text","banner_cta_text")}{field("Banner link","banner_link")}{field("Promotion message","promotion_message")}<label className="check"><input type="checkbox" checked={settings.banner_enabled!==false} onChange={e=>set("banner_enabled",e.target.checked)}/> Show banner</label></div>}

  {section==="videos"&&<div className="grid">{videos.map((v,i)=><div className="card form" key={v.id}><h3>{v.title}</h3><label><span>Title</span><input value={v.title||""} onChange={e=>setVideos(xs=>xs.map((x,j)=>j===i?{...x,title:e.target.value}:x))}/></label><label><span>URL</span><input value={v.url||""} onChange={e=>setVideos(xs=>xs.map((x,j)=>j===i?{...x,url:e.target.value}:x))}/></label><label><span>Reward</span><input type="number" value={v.reward??0} onChange={e=>setVideos(xs=>xs.map((x,j)=>j===i?{...x,reward:Number(e.target.value)}:x))}/></label><label className="check"><input type="checkbox" checked={v.active!==false} onChange={e=>setVideos(xs=>xs.map((x,j)=>j===i?{...x,active:e.target.checked}:x))}/> Active</label><button className="save" onClick={()=>void saveVideo(v)}>Save video</button></div>)}</div>}

  {section==="banks"&&<div className="card form">{field("Supported banks (comma separated)","supported_banks_text")}<p className="hint">Users can use the searchable bank selector on the main website. Only your configured bank-transfer method should be shown.</p></div>}
  {section==="maintenance"&&<div className="card form">{field("Maintenance message","maintenance_message")}<label className="check"><input type="checkbox" checked={settings.maintenance_enabled===true} onChange={e=>set("maintenance_enabled",e.target.checked)}/> Enable maintenance mode</label></div>}
  </main></div>
}
createRoot(document.getElementById("root")!).render(<App/>);
