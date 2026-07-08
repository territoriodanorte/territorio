"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc, updateDoc, getCountFromServer } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Territory, Block } from "@/lib/types";
import { useEditMode } from "@/components/edit-mode-provider";
import { ArrowLeft, Map, Plus, Trash2, Edit2, Check, X } from "lucide-react";
import Link from "next/link";

export default function BlocksPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { isEditMode, requestEditMode } = useEditMode();
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  // Guarda quais quadras ja tiveram o contador conferido nesta sessao,
  // pra nao ficar reconferindo/reescrevendo em loop.
  const checkedBlocksRef = useRef<Set<string>>(new Set());

  // Controle do "Desfazer" ao excluir uma quadra: ela some da tela na hora,
  // mas so e apagada de verdade do banco depois de alguns segundos.
  const [pendingDeleteBlockIds, setPendingDeleteBlockIds] = useState<Set<string>>(new Set());
  const [undoBlock, setUndoBlock] = useState<{ id: string; name: string } | null>(null);
  const blockDeleteTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    if (!id) return;
    const unsubTerritory = onSnapshot(doc(db, "territories", id), (docObj) => {
      if (docObj.exists()) setTerritory({ id: docObj.id, ...docObj.data() } as Territory);
      else router.push("/");
    });
    // Os contadores (visited/unvisited) ja vem salvos dentro de cada documento
    // de quadra, entao a lista carrega rapido, sem baixar as casas todas.
    const unsubBlocks = onSnapshot(query(collection(db, `territories/${id}/blocks`)), (snapshot) => {
      const data = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data(),
        visited: d.data().visited ?? 0,
        unvisited: d.data().unvisited ?? 0,
      })) as Block[];
      data.sort((a, b) => (parseInt((a.name || "").replace(/\D/g, "")) || 0) - (parseInt((b.name || "").replace(/\D/g, "")) || 0));
      setBlocks(data);

      // Assim que o territorio abre, confere (uma vez por quadra, nesta sessao)
      // se o numero salvo bate com a quantidade real de casas, usando uma
      // contagem leve do Firestore (nao baixa as casas, so conta) - por isso
      // nao deixa o app lento. So escreve de volta se o numero estiver errado.
      data.forEach((b) => {
        if (checkedBlocksRef.current.has(b.id)) return;
        checkedBlocksRef.current.add(b.id);
        (async () => {
          try {
            const totalSnap = await getCountFromServer(query(collection(db, "houses"), where("blockId", "==", b.id)));
            const visitedSnap = await getCountFromServer(query(collection(db, "houses"), where("blockId", "==", b.id), where("status", "==", "visited")));
            const total = totalSnap.data().count;
            const visited = visitedSnap.data().count;
            const unvisited = total - visited;
            if (visited !== (b.visited ?? 0) || unvisited !== (b.unvisited ?? 0)) {
              await updateDoc(doc(db, `territories/${id}/blocks`, b.id), { visited, unvisited });
            }
          } catch (e) { console.error("Erro ao conferir contagem da quadra", b.id, e); }
        })();
      });
    });
    return () => { unsubTerritory(); unsubBlocks(); };
  }, [id, router]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await addDoc(collection(db, `territories/${id}/blocks`), {
        name: newName.trim(),
        territoryId: id,
        createdAt: Date.now(),
        visited: 0,
        unvisited: 0,
      });
      setNewName("");
    } catch (e) { console.error(e); }
  };
  const handleDelete = (bid: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const b = blocks.find(x => x.id === bid);
    setPendingDeleteBlockIds(prev => new Set(prev).add(bid));
    setUndoBlock({ id: bid, name: b?.name || "" });
    const timer = setTimeout(async () => {
      await deleteDoc(doc(db, `territories/${id}/blocks`, bid));
      setPendingDeleteBlockIds(prev => { const s = new Set(prev); s.delete(bid); return s; });
      delete blockDeleteTimers.current[bid];
      setUndoBlock(curr => (curr && curr.id === bid ? null : curr));
    }, 5000);
    blockDeleteTimers.current[bid] = timer;
  };
  const undoDeleteBlock = () => {
    if (!undoBlock) return;
    const timer = blockDeleteTimers.current[undoBlock.id];
    if (timer) { clearTimeout(timer); delete blockDeleteTimers.current[undoBlock.id]; }
    setPendingDeleteBlockIds(prev => { const s = new Set(prev); s.delete(undoBlock.id); return s; });
    setUndoBlock(null);
  };
  const startEdit = (b: Block, e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); setEditingId(b.id); setEditName(b.name); };
  const saveEdit = async (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!editingId || !editName.trim()) return;
    await updateDoc(doc(db, `territories/${id}/blocks`, editingId), { name: editName.trim() });
    setEditingId(null);
  };

  if (!territory) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 bg-slate-50">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
        <p className="text-sm font-bold">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      <header className="bg-white p-4 flex justify-between items-center shrink-0">
        <div className="flex gap-4 items-center">
          <Link href="/" className="bg-slate-100 p-3 rounded-2xl text-slate-700 hover:bg-slate-200 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none text-blue-500 mb-0.5">{territory.name}</h1>
            <p className="text-[11px] font-medium text-slate-400">{blocks.length} Quadras</p>
          </div>
        </div>
        <button onClick={requestEditMode} className="bg-slate-100 text-slate-600 p-3 rounded-2xl hover:bg-slate-200 transition-colors">
          <Edit2 className="w-5 h-5" />
        </button>
      </header>

      <div className="bg-white px-5 py-3 border-y border-slate-100 flex items-center gap-6 shrink-0 text-[10px] font-bold text-slate-500">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
          <span>Não Atendeu / Não Visitado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
          <span>Sim (Atendeu)</span>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto px-4 py-6 text-slate-800 bg-[#f8f9fc]">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 pb-8">
          {blocks.filter(b => !pendingDeleteBlockIds.has(b.id)).map(b => {
            return (
              <div key={b.id} className="relative group">
                {editingId === b.id ? (
                  <div className="bg-white rounded-3xl p-4 shadow-sm border border-slate-100 flex flex-col gap-3">
                    <input autoFocus className="border-2 border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 text-slate-900 font-bold text-xl w-full" value={editName} onChange={(e) => setEditName(e.target.value)} />
                    <div className="flex gap-2">
                      <button onClick={saveEdit} className="flex-1 p-2 text-white bg-green-500 hover:bg-green-600 rounded-xl font-bold">Salvar</button>
                      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingId(null); }} className="flex-1 p-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <Link href={`/territory/${id}/block/${b.id}`} className="block bg-white rounded-2xl p-4 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05),0_10px_20px_-2px_rgba(0,0,0,0.02)] border border-slate-100 relative group overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[17px] font-bold text-[#1e293b]">{b.name}</span>
                      {isEditMode && (
                        <div className="flex gap-1" onClick={e => e.preventDefault()}>
                          <button onClick={(e) => startEdit(b, e)} className="p-1.5 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={(e) => handleDelete(b.id, e)} className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 bg-red-600 rounded-full"></span>
                        <span className="font-semibold text-slate-500 text-xs">{b.unvisited ?? 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-3.5 h-3.5 bg-green-600 rounded-full"></span>
                        <span className="font-semibold text-slate-500 text-xs">{b.visited ?? 0}</span>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            );
          })}

          {isEditMode && (
            <div className="bg-slate-100 border border-slate-200 p-4 rounded-3xl flex flex-col justify-center min-h-[100px]">
              <div className="flex gap-2 items-center">
                <input
                  className="w-full border-0 rounded-2xl px-3 py-3 text-slate-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none text-lg bg-white"
                  placeholder="Q.12"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <button
                  onClick={handleAdd}
                  className="h-12 w-12 flex items-center justify-center bg-blue-500 text-white rounded-2xl font-black hover:bg-blue-600 shrink-0"
                >
                  <Plus className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {blocks.length === 0 && !isEditMode && (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 pb-20">
            <p className="font-medium text-center text-sm">Nenhuma quadra adicionada ainda.<br />Ative a edição para criar.</p>
          </div>
        )}
      </main>

      {undoBlock && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white pl-5 pr-3 py-3 rounded-2xl shadow-2xl flex items-center gap-4">
          <span className="text-sm font-bold">Quadra {undoBlock.name} excluída</span>
          <button onClick={undoDeleteBlock} className="text-blue-300 font-black uppercase text-xs tracking-widest hover:text-blue-200 px-3 py-2 rounded-xl hover:bg-white/10">Desfazer</button>
        </div>
      )}
    </div>
  );
}
