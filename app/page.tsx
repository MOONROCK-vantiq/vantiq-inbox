 "use client";

import { useEffect, useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import type { Session } from "@supabase/supabase-js";

type Workspace = { id: string; name: string };
type Message = {
  id: string; sender_name: string | null; sender_email: string | null;
  subject: string; body: string; status: string; received_at: string;
};

export default function Home() {
  const supabase = useMemo(() => getSupabase(), []);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [sender, setSender] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
    });
    return () => listener.subscription.unsubscribe();
  }, [supabase]);

  useEffect(() => {
    if (session) void loadWorkspace();
    else { setWorkspace(null); setMessages([]); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  async function loadWorkspace() {
    setNotice("");
    const { data, error } = await supabase.from("workspaces").select("id,name").order("created_at").limit(1).maybeSingle();
    if (error) { setNotice(error.message); return; }
    if (data) {
      setWorkspace(data);
      await loadMessages(data.id);
    } else {
      const defaultName = (session?.user.email?.split("@")[0] || "Mon entreprise").replace(/[._-]/g, " ");
      const { data: created, error: createError } = await supabase
        .from("workspaces").insert({ name: defaultName, owner_id: session?.user.id }).select("id,name").single();
      if (createError) { setNotice("Impossible de créer votre espace : " + createError.message); return; }
      setWorkspace(created);
      await loadMessages(created.id);
    }
  }

  async function loadMessages(workspaceId: string) {
    const { data, error } = await supabase.from("inbox_messages")
      .select("id,sender_name,sender_email,subject,body,status,received_at")
      .eq("workspace_id", workspaceId).order("received_at", { ascending: false });
    if (error) setNotice(error.message);
    else setMessages((data || []) as Message[]);
  }

  async function authenticate(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setNotice("");
    try {
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      if (mode === "signup" && !result.data.session) {
        setNotice("Compte créé. Vérifie ta boîte e-mail pour confirmer ton adresse, puis connecte-toi.");
      } else setNotice("Connexion réussie.");
    } catch (err) {
      setNotice(err instanceof Error ? err.message : "Une erreur est survenue.");
    } finally { setBusy(false); }
  }

  async function addMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!workspace) return;
    setBusy(true); setNotice("");
    const { error } = await supabase.from("inbox_messages").insert({
      workspace_id: workspace.id, sender_name: sender || null,
      sender_email: senderEmail || null, subject, body, source: "manual"
    });
    if (error) setNotice(error.message);
    else {
      setSender(""); setSenderEmail(""); setSubject(""); setBody("");
      setNotice("Demande enregistrée dans votre Inbox.");
      await loadMessages(workspace.id);
    }
    setBusy(false);
  }

  async function updateStatus(message: Message, status: string) {
    const { error } = await supabase.from("inbox_messages").update({ status }).eq("id", message.id);
    if (error) setNotice(error.message);
    else if (workspace) await loadMessages(workspace.id);
  }

  async function logout() { await supabase.auth.signOut(); }

  const visible = messages.filter(m => {
    const matchesFilter = filter === "all" || m.status === filter;
    const q = search.toLowerCase();
    const matchesSearch = !q || `${m.sender_name || ""} ${m.sender_email || ""} ${m.subject} ${m.body}`.toLowerCase().includes(q);
    return matchesFilter && matchesSearch;
  });
  const current = messages.find(m => m.id === selected) || visible[0] || null;
  const counts = {
    all: messages.length,
    new: messages.filter(m => m.status === "new").length,
    in_progress: messages.filter(m => m.status === "in_progress").length,
    replied: messages.filter(m => m.status === "replied").length
  };

  if (loading) return <main className="center"><div className="loader"/>Chargement de VANTIQ…</main>;

  if (!session) return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="brand"><span className="brand-mark">V</span><span>VANTIQ</span></div>
        <p className="eyebrow">L'ESPACE DE TRAVAIL INTELLIGENT</p>
        <h1>{mode === "signup" ? "Créez votre espace." : "Content de vous revoir."}</h1>
        <p className="muted">Centralisez les demandes de votre entreprise dans une seule boîte de réception.</p>
        <form onSubmit={authenticate} className="stack">
          <label>Adresse e-mail<input type="email" required autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@entreprise.fr"/></label>
          <label>Mot de passe<input type="password" required minLength={8} autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="8 caractères minimum"/></label>
          <button className="primary" disabled={busy}>{busy ? "Patientez…" : mode === "signup" ? "Créer mon compte" : "Se connecter"}</button>
        </form>
        <p className="switch">{mode === "signup" ? "Vous avez déjà un compte ?" : "Pas encore de compte ?"} <button className="text-button" onClick={() => {setMode(mode === "signup" ? "login" : "signup");setNotice("");}}>{mode === "signup" ? "Se connecter" : "Créer un compte"}</button></p>
        {notice && <p className="notice">{notice}</p>}
        <p className="tiny">En créant un compte, vous acceptez les conditions d'utilisation de VANTIQ.</p>
      </section>
    </main>
  );

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">V</span><span>VANTIQ</span></div>
        <div className="workspace-label">ESPACE DE TRAVAIL</div>
        <div className="workspace-name"><span className="workspace-dot"/> {workspace?.name || "Chargement…"}</div>
        <nav>
          <button className="nav-item active"><span>✉</span> Inbox <b>{counts.new}</b></button>
          <button className="nav-item" onClick={() => setNotice("Le module Clients sera ajouté dans une prochaine version.")}><span>♙</span> Clients</button>
          <button className="nav-item" onClick={() => setNotice("Les automatisations seront ajoutées dans une prochaine version.")}><span>⌘</span> Automatisations</button>
          <button className="nav-item" onClick={() => setNotice("Les statistiques seront ajoutées dans une prochaine version.")}><span>▥</span> Statistiques</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="user-chip"><div className="avatar">{session.user.email?.[0]?.toUpperCase()}</div><div><strong>{session.user.email}</strong><small>Compte connecté</small></div></div>
          <button className="logout" onClick={logout}>Déconnexion ↗</button>
        </div>
      </aside>
      <section className="main-area">
        <header className="topbar"><div><p className="eyebrow">VOTRE ACTIVITÉ</p><h1>Boîte de réception</h1></div><button className="primary small" onClick={() => document.getElementById("new-message")?.scrollIntoView({behavior:"smooth"})}>＋ Nouvelle demande</button></header>
        {notice && <div className="notice inline-notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
        <div className="stats">
          <div className="stat-card"><span>Total des demandes</span><strong>{counts.all}</strong><small>Dans votre espace</small></div>
          <div className="stat-card"><span>Nouvelles</span><strong>{counts.new}</strong><small>À consulter</small></div>
          <div className="stat-card"><span>En cours</span><strong>{counts.in_progress}</strong><small>En traitement</small></div>
          <div className="stat-card"><span>Traitées</span><strong>{counts.replied}</strong><small>Réponses envoyées</small></div>
        </div>
        <div className="inbox-layout">
          <section className="panel list-panel">
            <div className="panel-heading"><div><h2>Demandes</h2><span>{visible.length} résultat(s)</span></div><input className="search" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}/></div>
            <div className="filters">
              {[["all","Toutes"],["new","Nouvelles"],["in_progress","En cours"],["replied","Traitées"]].map(([key,label]) => <button key={key} className={filter===key?"filter active-filter":"filter"} onClick={() => setFilter(key)}>{label}</button>)}
            </div>
            <div className="message-list">
              {visible.map(m => <button key={m.id} className={`message-row ${current?.id===m.id?"selected":""}`} onClick={() => setSelected(m.id)}>
                <div className="message-avatar">{(m.sender_name || m.sender_email || "?")[0].toUpperCase()}</div>
                <div className="message-summary"><div className="message-line"><strong>{m.sender_name || m.sender_email || "Expéditeur inconnu"}</strong><time>{new Date(m.received_at).toLocaleDateString("fr-FR")}</time></div><b>{m.subject}</b><p>{m.body.slice(0,78)}{m.body.length>78?"…":""}</p></div>
                {m.status==="new" && <i className="unread-dot"/>}
              </button>)}
              {visible.length===0 && <div className="empty">Aucune demande pour le moment.<br/><span>Ajoutez une demande de test avec le formulaire ci-dessous.</span></div>}
            </div>
          </section>
          <section className="panel detail-panel">
            {current ? <>
              <div className="detail-head"><div><span className="eyebrow">MESSAGE SÉLECTIONNÉ</span><h2>{current.subject}</h2></div><span className={`status status-${current.status}`}>{current.status==="new"?"Nouveau":current.status==="in_progress"?"En cours":current.status==="replied"?"Traité":"Archivé"}</span></div>
              <div className="sender-block"><div className="message-avatar large">{(current.sender_name || "?")[0].toUpperCase()}</div><div><strong>{current.sender_name || "Expéditeur inconnu"}</strong><p>{current.sender_email || "Adresse non renseignée"}</p></div></div>
              <div className="message-body">{current.body || "(Message vide)"}</div>
              <div className="detail-actions"><label>Statut<select value={current.status} onChange={e => updateStatus(current,e.target.value)}><option value="new">Nouveau</option><option value="in_progress">En cours</option><option value="replied">Traité</option><option value="archived">Archivé</option></select></label><button className="secondary" onClick={() => navigator.clipboard?.writeText(current.body)}>Copier le message</button></div>
              <div className="ai-placeholder"><span>✧</span><div><strong>Assistant IA VANTIQ</strong><p>La préparation de réponses assistée par IA sera connectée dans une prochaine étape.</p></div><span className="coming">BIENTÔT</span></div>
            </> : <div className="empty detail-empty">Sélectionnez une demande pour afficher son contenu.</div>}
          </section>
        </div>
        <section className="panel add-panel" id="new-message">
          <div className="panel-heading"><div><h2>Ajouter une demande manuellement</h2><span>Utile pour tester l'Inbox avant de connecter une adresse e-mail.</span></div></div>
          <form className="new-form" onSubmit={addMessage}>
            <label>Nom de l'expéditeur<input value={sender} onChange={e=>setSender(e.target.value)} placeholder="Jean Dupont"/></label>
            <label>E-mail<input type="email" value={senderEmail} onChange={e=>setSenderEmail(e.target.value)} placeholder="jean@exemple.fr"/></label>
            <label className="full">Objet<input required value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Demande de renseignements"/></label>
            <label className="full">Message<textarea required rows={4} value={body} onChange={e=>setBody(e.target.value)} placeholder="Saisissez le contenu de la demande…"/></label>
            <div className="full form-bottom"><span>Enregistré directement dans votre base Supabase.</span><button className="primary" disabled={busy || !workspace}>{busy?"Enregistrement…":"Enregistrer la demande"}</button></div>
          </form>
        </section>
        <footer>VANTIQ © {new Date().getFullYear()} · Votre espace professionnel</footer>
      </section>
    </main>
  );
}