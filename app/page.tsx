"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, addDoc, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Territory } from "@/lib/types";
import { useEditMode } from "@/components/edit-mode-provider";
import Link from "next/link";
import { Map, LayoutGrid, Plus, Trash2, Edit2, Check, X, MapPin } from "lucide-react";

export default function TerritoriesPage() {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [loading, setLoading] = useState(true);
  const { isEditMode, requestEditMode } = useEditMode();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  useEffect(() => {
    const q = query(collection(db, "territories"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Territory[];
      
      data.sort((a, b) => {
        const numA = parseInt((a.name || "").replace(/\D/g, "")) || 0;
        const numB = parseInt((b.name || "").replace(/\D/g, "")) || 0;
        return numA - numB;
      });
      
      setTerritories(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      await addDoc(collection(db, "territories"), {
        name: newName.trim(),
        mapImageUrl: "",
        createdAt: Date.now()
      });
      setNewName("");
    } catch (error) {
      console.error("Error adding territory", error);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Tem certeza? Isso excluirá todas as quadras e casas deste território.")) return;
    try {
      await deleteDoc(doc(db, "territories", id));
    } catch (error) {
      console.error("Error deleting", error);
    }
  };

  const startEdit = (t: Territory, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(t.id);
    setEditName(t.name);
  };

  const saveEdit = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editingId || !editName.trim()) return;
    try {
      await updateDoc(doc(db, "territories", editingId), { name: editName.trim() });
      setEditingId(null);
    } catch (error) {
      console.error("Error updating", error);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      <header className="bg-gradient-to-br from-blue-600 to-blue-500 text-white px-6 pb-6 pt-10 flex justify-between items-center shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-2xl">
            <Map className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight leading-none mb-1">Norte - Navegantes</h1>
            <p className="text-xs font-medium opacity-90">Selecione um território para gerenciar</p>
          </div>
        </div>
        <button onClick={requestEditMode} className="bg-white text-blue-600 p-2.5 rounded-xl shadow-sm active:scale-95 transition-transform flex-shrink-0">
          <Edit2 className="w-5 h-5" />
        </button>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-6 flex flex-col gap-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-8">
          {territories.map(t => (
            <div key={t.id} className="bg-white p-5 rounded-3xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-slate-100 flex flex-col gap-5 group relative">
              <div className="flex justify-between items-start">
                {editingId === t.id ? (
                  <div className="flex items-center gap-2 flex-1 relative z-10 w-full mb-1">
                    <input
                      autoFocus
                      className="border-2 border-slate-200 rounded-xl px-3 py-2 outline-none focus:border-blue-500 text-slate-900 font-bold text-xl w-full"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                    />
                    <button onClick={saveEdit} className="p-2 text-white bg-green-500 hover:bg-green-600 rounded-xl">
                      <Check className="w-5 h-5" />
                    </button>
                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingId(null); }} className="p-2 text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center p-1">
                        <MapPin className="w-5 h-5 text-red-500 fill-red-500" />
                      </div>
                      <span className="text-xl font-bold text-slate-800 uppercase tracking-tight">{t.name}</span>
                    </div>
                    {isEditMode && (
                      <div className="flex gap-1 relative z-10">
                        <button onClick={(e) => startEdit(t, e)} className="p-2 bg-slate-50 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => handleDelete(t.id, e)} className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
              
              {!editingId && (
                <div className="flex gap-3">
                  <Link href={`/territory/${t.id}/map`} className="flex-1 bg-slate-50 text-slate-600 text-sm font-bold py-3.5 rounded-[0.8rem] flex items-center justify-center gap-2 hover:bg-slate-100 transition-colors">
                    <Map className="w-4 h-4" /> Mapa
                  </Link>
                  <Link href={`/territory/${t.id}/blocks`} className="flex-1 bg-blue-500 text-white text-sm font-bold py-3.5 rounded-[0.8rem] flex items-center justify-center gap-2 hover:bg-blue-600 transition-colors shadow-sm shadow-blue-500/20">
                    <LayoutGrid className="w-4 h-4" /> Quadras
                  </Link>
                </div>
              )}
            </div>
          ))}

          {isEditMode && (
            <div className="bg-slate-50 p-5 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col justify-center min-h-[140px]">
              <div className="flex gap-2 items-center">
                <input
                  className="w-full border border-slate-200 rounded-2xl px-4 py-4 text-slate-900 font-bold focus:border-blue-500 outline-none text-lg bg-white"
                  placeholder="Novo ex: N01"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <button
                  onClick={handleAdd}
                  className="h-14 w-14 flex items-center justify-center bg-blue-500 text-white rounded-2xl font-black shadow-md hover:bg-blue-600 shrink-0"
                >
                  <Plus className="w-6 h-6" />
                </button>
              </div>
            </div>
          )}
        </div>

        {territories.length === 0 && !isEditMode && loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-sm font-bold">Carregando...</p>
          </div>
        )}

        {territories.length === 0 && !isEditMode && !loading && (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 pb-20">
            <LayoutGrid className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-bold">Nenhum território</p>
            <p className="text-sm opacity-70">Ative a edição para adicionar.</p>
          </div>
        )}
      </main>
    </div>
  );
}
