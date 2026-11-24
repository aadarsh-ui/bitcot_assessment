import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useSubscription } from "@apollo/client";
import { useAuth } from "react-oidc-context";
import { CREATE_TASK, DELETE_TASK, GET_TASKS, TASK_CHANGED, UPDATE_TASK } from "./graphql";

type Task = {
  id: string; title: string; description?: string | null; status: "TODO"|"IN_PROGRESS"|"COMPLETED";
  priority: "LOW"|"MEDIUM"|"HIGH"; dueDate?: string | null;
};

const empty = { title: "", description: "", priority: "MEDIUM", dueDate: "" };

export default function App() {
  const auth = useAuth();
  const { data, loading, error, refetch } = useQuery<{ getTasks: Task[] }>(GET_TASKS);
  const [createTask, createState] = useMutation(CREATE_TASK);
  const [updateTask] = useMutation(UPDATE_TASK);
  const [deleteTask] = useMutation(DELETE_TASK);
  const { data: live } = useSubscription(TASK_CHANGED);
  const [form, setForm] = useState(empty);
  const [editing, setEditing] = useState<Task | null>(null);
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    if (live?.taskChanged) {
      setNotice(live.taskChanged.deleted ? "Task deleted" : "Task updated live");
      void refetch();
    }
  }, [live, refetch]);

  const tasks = useMemo(() => (data?.getTasks ?? []).filter(t => filter === "ALL" || t.status === filter), [data, filter]);
  const counts = useMemo(() => {
    const all = data?.getTasks ?? [];
    return { all: all.length, todo: all.filter(t => t.status === "TODO").length, progress: all.filter(t => t.status === "IN_PROGRESS").length, done: all.filter(t => t.status === "COMPLETED").length };
  }, [data]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return setNotice("A task title is required");
    try {
      if (editing) await updateTask({ variables: { id: editing.id, input: { title: form.title.trim(), description: form.description || null, priority: form.priority, dueDate: form.dueDate || null } } });
      else await createTask({ variables: { input: { title: form.title.trim(), description: form.description || null, priority: form.priority, dueDate: form.dueDate || null } } });
      setForm(empty); setEditing(null); setNotice(editing ? "Task updated" : "Task created");
      await refetch();
    } catch (e: any) { setNotice(e.message ?? "Request failed"); }
  }

  function beginEdit(task: Task) {
    setEditing(task);
    setForm({ title: task.title, description: task.description ?? "", priority: task.priority, dueDate: task.dueDate ? task.dueDate.slice(0, 10) : "" });
  }

  async function remove(id: string) {
    if (!confirm("Delete this task?")) return;
    await deleteTask({ variables: { id } });
    await refetch();
  }

  async function advance(task: Task) {
    const status = task.status === "TODO" ? "IN_PROGRESS" : task.status === "IN_PROGRESS" ? "COMPLETED" : "TODO";
    await updateTask({ variables: { id: task.id, input: { status } } });
    await refetch();
  }

  return (
    <main>
      <aside>
        <div className="brand"><span>✓</span> Taskflow</div>
        <nav><button className="active">Overview</button></nav>
        <div className="profile"><div className="avatar">AU</div><div><strong>{auth.user?.profile.email ?? "Signed in"}</strong><small>Authenticated account</small></div></div>
      </aside>
      <section className="content">
        <header><div><p className="eyebrow">Workspace</p><h1>Good morning</h1></div><div className="header-actions"><button className="secondary sign-out" onClick={() => void auth.signoutRedirect()}>Sign out</button><button className="primary" onClick={() => { setEditing(null); setForm(empty); document.getElementById("title")?.focus(); }}>+ New task</button></div></header>
        {notice && <div className="notice" role="status">{notice}<button onClick={() => setNotice("")}>×</button></div>}
        <div className="stats">
          <article><span>All tasks</span><strong>{counts.all}</strong></article>
          <article><span>To do</span><strong>{counts.todo}</strong></article>
          <article><span>In progress</span><strong>{counts.progress}</strong></article>
          <article><span>Completed</span><strong>{counts.done}</strong></article>
        </div>
        <div className="workspace">
          <section className="list">
            <div className="toolbar"><h2>Tasks</h2><div>{["ALL","TODO","IN_PROGRESS","COMPLETED"].map(v => <button key={v} className={filter===v?"selected":""} onClick={() => setFilter(v)}>{v.replace("_"," ")}</button>)}</div></div>
            {loading && <div className="state">Loading tasks…</div>}
            {error && <div className="state error">Could not load tasks. {error.message}</div>}
            {!loading && !error && tasks.length === 0 && <div className="state"><b>No tasks here</b><span>Create a task to get started.</span></div>}
            {tasks.map(task => (
              <article className="task" key={task.id}>
                <button className={`check ${task.status==="COMPLETED"?"done":""}`} onClick={() => void advance(task)} aria-label="Advance status">{task.status==="COMPLETED"?"✓":""}</button>
                <div className="task-main"><h3>{task.title}</h3>{task.description && <p>{task.description}</p>}<div><span className={`priority ${task.priority.toLowerCase()}`}>{task.priority}</span>{task.dueDate && <span>Due {new Date(task.dueDate).toLocaleDateString()}</span>}<span className="status">{task.status.replace("_"," ")}</span></div></div>
                <div className="actions"><button onClick={() => beginEdit(task)}>Edit</button><button className="danger" onClick={() => void remove(task.id)}>Delete</button></div>
              </article>
            ))}
          </section>
          <form onSubmit={submit}>
            <h2>{editing ? "Edit task" : "Create task"}</h2>
            <label>Title<input id="title" required maxLength={200} value={form.title} onChange={e => setForm({...form,title:e.target.value})} placeholder="What needs to be done?"/></label>
            <label>Description<textarea rows={4} value={form.description} onChange={e => setForm({...form,description:e.target.value})} placeholder="Add details"/></label>
            <div className="two"><label>Priority<select value={form.priority} onChange={e => setForm({...form,priority:e.target.value as any})}><option>LOW</option><option>MEDIUM</option><option>HIGH</option></select></label><label>Due date<input type="date" value={form.dueDate} onChange={e => setForm({...form,dueDate:e.target.value})}/></label></div>
            <button className="primary" disabled={createState.loading}>{editing ? "Save changes" : "Create task"}</button>
            {editing && <button type="button" className="secondary" onClick={() => {setEditing(null);setForm(empty);}}>Cancel</button>}
          </form>
        </div>
      </section>
    </main>
  );
}
