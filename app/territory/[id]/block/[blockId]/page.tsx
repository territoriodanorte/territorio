"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc, updateDoc, writeBatch } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Territory, Block, House, Side } from "@/lib/types";
import { useEditMode } from "@/components/edit-mode-provider";
import { ArrowLeft, Edit2, Check, X, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

export default function BlockPage() {
  const params = useParams();
  const territoryId = params?.id as string;
  const blockId = params?.blockId as string;
  const router = useRouter();
  const { isEditMode, requestEditMode } = useEditMode();

  const [territory, setTerritory] = useState<Territory | null>(null);
  const [block, setBlock] = useState<Block | null>(null);
  const [houses, setHouses] = useState<House[]>([]);
  const [streetNames, setStreetNames] = useState<Record<Side, string>>({ top: "", right: "", bottom: "", left: "" });
  const [editingStreet, setEditingStreet] = useState<Side | null>(null);

  const [selectedHouse, setSelectedHouse] = useState<House | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addingToSide, setAddingToSide] = useState<{side: Side, orderIndex: number} | null>(null);
  const [newHouseNumber, setNewHouseNumber] = useState("");

  const [editingHouse, setEditingHouse] = useState<House | null>(null);
  const [editingHouseNumber, setEditingHouseNumber] = useState("");
  const [isSavingHouse, setIsSavingHouse] = useState(false);

  const housesPath = `houses`;

  useEffect(() => {
    if (!territoryId || !blockId) return;
    const unsubTerritory = onSnapshot(doc(db, "territories", territoryId), (docObj) => {
      if (docObj.exists()) setTerritory({ id: docObj.id, ...docObj.data() } as Territory);
    });
    const unsubBlock = onSnapshot(doc(db, `territories/${territoryId}/blocks`, blockId), (doc) => {
      if (doc.exists()) {
        const data = { id: doc.id, ...doc.data() } as Block;
        setBlock(data);
        if (data.streetNames) setStreetNames(data.streetNames);
      } else router.push(`/territory/${territoryId}/blocks`);
    });
    const unsubHouses = onSnapshot(query(collection(db, housesPath), where('blockId', '==', blockId)), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })) as House[];
      data.sort((a, b) => (a.order || 0) - (b.order || 0));
      setHouses(data);
    });
    return () => { unsubTerritory(); unsubBlock(); unsubHouses(); };
  }, [territoryId, blockId, router]);

  const atualizarContadores = async (listaCasas: House[]) => {
    const visited = listaCasas.filter(h => h.status === 'visited').length;
    const unvisited = listaCasas.length - visited;
    await updateDoc(doc(db, `territories/${territoryId}/blocks`, blockId), { visited, unvisited });
  };

  const saveStreetName = async (side: Side) => {
    if (!block) return;
    await updateDoc(doc(db, `territories/${territoryId}/blocks`, blockId), {
      [`streetNames.${side}`]: streetNames[side]
    });
    setEditingStreet(null);
  };

  const handleHouseClick = (h: House) => {
    setSelectedHouse(h);
    setDialogOpen(true);
  };

  const updateHouseStatus = async (status: 'visited' | 'not_visited' | 'not_answered') => {
    if (!selectedHouse) return;
    await updateDoc(doc(db, housesPath, selectedHouse.id), { status });
    setDialogOpen(false); setSelectedHouse(null);
    const novaLista = houses.map(h => h.id === selectedHouse.id ? { ...h, status } : h);
    atualizarContadores(novaLista);
  };

  const deleteHouse = async (houseId: string) => {
    if (!confirm("Excluir esta casa?")) return;
    await deleteDoc(doc(db, housesPath, houseId));
    const novaLista = houses.filter(h => h.id !== houseId);
    atualizarContadores(novaLista);
  };

  const updateHouseNumber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHouse || !editingHouseNumber.trim()) return;
    await updateDoc(doc(db, housesPath, editingHouse.id), { number: editingHouseNumber.trim() });
    setEditingHouse(null);
    setEditingHouseNumber("");
  };

  const addHouse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingToSide || !newHouseNumber.trim() || isSavingHouse) return;
    setIsSavingHouse(true);
    try {
      const sideHouses = houses.filter(h => h.side === addingToSide.side);
      const batch = writeBatch(db);
      const newHouseRef = doc(collection(db, housesPath));
      batch.set(newHouseRef, {
        side: addingToSide.side, number: newHouseNumber.trim(), status: 'not_visited', order: addingToSide.orderIndex, createdAt: Date.now()
      });
      sideHouses.forEach(h => {
        if (h.order >= addingToSide.orderIndex) batch.update(doc(db, housesPath, h.id), { order: h.order + 1 });
      });
      await batch.commit();
      setAddingToSide(null); setNewHouseNumber("");
      atualizarContadores([...houses, { id: newHouseRef.id, side: addingToSide.side, number: newHouseNumber.trim(), status: 'not_visited', order: addingToSide.orderIndex, createdAt: Date.now() } as House]);
    } finally {
      setIsSavingHouse(false);
    }
  };

  const moveHouse = async (houseToMove: House, direction: 'left' | 'right') => {
    const sideHouses = houses.filter(h => h.side === houseToMove.side).sort((a,b) => a.order - b.order);
    const currentIndex = sideHouses.findIndex(h => h.id === houseToMove.id);
    if (currentIndex < 0) return;
    if (direction === 'left' && currentIndex > 0) {
      const prev = sideHouses[currentIndex - 1];
      const batch = writeBatch(db);
      batch.update(doc(db, housesPath, houseToMove.id), { order: prev.order });
      batch.update(doc(db, housesPath, prev.id), { order: houseToMove.order });
      await batch.commit();
    } else if (direction === 'right' && currentIndex < sideHouses.length - 1) {
      const next = sideHouses[currentIndex + 1];
      const batch = writeBatch(db);
      batch.update(doc(db, housesPath, houseToMove.id), { order: next.order });
      batch.update(doc(db, housesPath, next.id), { order: houseToMove.order });
      await batch.commit();
    }
  };

  const clearVisits = async () => {
    if (!confirm("Voltar todas as casas para 'Pendente'?")) return;
    const batch = writeBatch(db);
    houses.forEach(h => batch.update(doc(db, housesPath, h.id), { status: 'not_visited' }));
    await batch.commit();
    atualizarContadores(houses.map(h => ({ ...h, status: 'not_visited' as const })));
  };

  if (!block || !territory) return null;

  const sideLabels: Record<Side, string> = { top: "TOPO", right: "DIREITA", bottom: "BAIXO", left: "ESQUERDA" };

  return (
    <div className="flex flex-col min-h-screen bg-white">
      <header className="bg-white p-4 flex justify-between items-center border-b border-slate-100 sticky top-0 z-10">
        <div className="flex gap-4 items-center">
           <Link href={`/territory/${territoryId}/blocks`} className="bg-slate-100 p-3 rounded-2xl text-slate-700 hover:bg-slate-200 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none text-slate-800 uppercase mb-0.5">{block.name}</h1>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-widest">{territory.name}</p>
          </div>
        </div>
        <div className="flex gap-3 items-center">
           {isEditMode && (
             <button onClick={clearVisits} className="flex flex-col items-center justify-center bg-red-50 text-red-600 px-4 py-3 rounded-xl border border-red-100 hover:bg-red-100 transition-colors">
               <span className="text-[10px] font-black uppercase tracking-widest leading-none">Limpar</span>
             </button>
           )}
          <button onClick={requestEditMode} className={cn("flex items-center justify-center p-3 rounded-2xl transition-colors", isEditMode ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
            <Edit2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="w-full bg-white overflow-visible">
        <div className="w-full flex flex-col items-center pt-4 pb-16">
          <div className="relative border border-slate-200 rounded-[2rem] w-[280px] bg-[#f8fafc] flex flex-col p-2 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.05),0_10px_20px_-2px_rgba(0,0,0,0.02)] z-0">

            <div className="absolute top-[48px] bottom-[48px] left-[64px] right-[64px] border-[1.5px] border-dashed border-slate-200 rounded-2xl -z-10 bg-[#f8f9fc]/50 opacity-50" />
            <div className="absolute inset-0 flex items-center justify-center -z-20">
              <span className="text-[4.5rem] font-black text-slate-100 uppercase tracking-tighter">{block.name}</span>
            </div>

            <div className="absolute -top-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <StreetLabel side="top" value={streetNames.top} editingStreet={editingStreet} setEditingStreet={setEditingStreet} streetNames={streetNames} setStreetNames={setStreetNames} saveStreetName={saveStreetName} isEditMode={isEditMode} />
            </div>
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <StreetLabel side="bottom" value={streetNames.bottom} editingStreet={editingStreet} setEditingStreet={setEditingStreet} streetNames={streetNames} setStreetNames={setStreetNames} saveStreetName={saveStreetName} isEditMode={isEditMode} />
            </div>
            <div className="absolute top-1/2 left-[-24px] -translate-y-1/2 -rotate-90 origin-center whitespace-nowrap -translate-x-1/2">
              <StreetLabel side="left" value={streetNames.left} editingStreet={editingStreet} setEditingStreet={setEditingStreet} streetNames={streetNames} setStreetNames={setStreetNames} saveStreetName={saveStreetName} isEditMode={isEditMode} />
            </div>
            <div className="absolute top-1/2 right-[-24px] -translate-y-1/2 rotate-90 origin-center whitespace-nowrap translate-x-1/2">
              <StreetLabel side="right" value={streetNames.right} editingStreet={editingStreet} setEditingStreet={setEditingStreet} streetNames={streetNames} setStreetNames={setStreetNames} saveStreetName={saveStreetName} isEditMode={isEditMode} />
            </div>

            <div className="flex justify-center gap-1 w-full flex-wrap pb-2 border-b border-dashed border-slate-200">
              {houses.filter(h => h.side === 'top').map(h => (
                <HouseBox key={h.id} h={h} isEditMode={isEditMode} deleteHouse={deleteHouse} isRow={true} addBefore={() => setAddingToSide({side: 'top', orderIndex: h.order})} addNext={() => setAddingToSide({side: 'top', orderIndex: h.order+1})} handleHouseClick={handleHouseClick} />
              ))}
              {isEditMode && houses.filter(h => h.side === 'top').length === 0 && <AddHouseBtn onClick={() => setAddingToSide({side: 'top', orderIndex: 0})} />}
            </div>

            <div className="flex justify-between w-full py-2 items-stretch gap-2">
              <div className="flex flex-col items-center justify-evenly gap-1 relative flex-1 min-w-[58px]">
                {houses.filter(h => h.side === 'left').map(h => (
                  <HouseBox key={h.id} h={h} isEditMode={isEditMode} deleteHouse={deleteHouse} isRow={false} addBefore={() => setAddingToSide({side: 'left', orderIndex: h.order})} addNext={() => setAddingToSide({side: 'left', orderIndex: h.order+1})} handleHouseClick={handleHouseClick} />
                ))}
                {isEditMode && houses.filter(h => h.side === 'left').length === 0 && <AddHouseBtn onClick={() => setAddingToSide({side: 'left', orderIndex: 0})} />}
              </div>
              <div className="flex flex-col items-center justify-evenly gap-1 relative flex-1 min-w-[58px]">
                {houses.filter(h => h.side === 'right').map(h => (
                  <HouseBox key={h.id} h={h} isEditMode={isEditMode} deleteHouse={deleteHouse} isRow={false} addBefore={() => setAddingToSide({side: 'right', orderIndex: h.order})} addNext={() => setAddingToSide({side: 'right', orderIndex: h.order+1})} handleHouseClick={handleHouseClick} />
                ))}
                {isEditMode && houses.filter(h => h.side === 'right').length === 0 && <AddHouseBtn onClick={() => setAddingToSide({side: 'right', orderIndex: 0})} />}
              </div>
            </div>

            <div className="flex justify-center gap-1 w-full flex-wrap pt-2 border-t border-dashed border-slate-200">
              {houses.filter(h => h.side === 'bottom').map(h => (
                <HouseBox key={h.id} h={h} isEditMode={isEditMode} deleteHouse={deleteHouse} isRow={true} addBefore={() => setAddingToSide({side: 'bottom', orderIndex: h.order})} addNext={() => setAddingToSide({side: 'bottom', orderIndex: h.order+1})} handleHouseClick={handleHouseClick} />
              ))}
              {isEditMode && houses.filter(h => h.side === 'bottom').length === 0 && <AddHouseBtn onClick={() => setAddingToSide({side: 'bottom', orderIndex: 0})} />}
            </div>

          </div>
        </div>
      </main>

      {addingToSide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <form onSubmit={addHouse} className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-xl border border-slate-200">
            <h2 className="text-2xl font-black mb-1 text-slate-900 uppercase">Nova Casa</h2>
            <p className="text-slate-500 mb-6 text-sm font-bold uppercase tracking-widest">{sideLabels[addingToSide.side]}</p>
            <input autoFocus className="w-full border-2 border-slate-200 p-4 rounded-xl mb-6 text-slate-900 text-3xl placeholder:text-slate-300 outline-none focus:border-blue-500 text-center font-black" placeholder="123" value={newHouseNumber} onChange={(e) => setNewHouseNumber(e.target.value)} />
            <div className="flex gap-3">
              <button type="button" onClick={() => { setAddingToSide(null); setNewHouseNumber(""); }} className="flex-1 py-4 text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 font-black uppercase text-sm">Cancelar</button>
              <button type="submit" disabled={isSavingHouse} className="flex-1 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black uppercase text-sm disabled:opacity-50">{isSavingHouse ? "Salvando..." : "Salvar"}</button>
            </div>
          </form>
        </div>
      )}

      {editingHouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <form onSubmit={updateHouseNumber} className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-xl border border-slate-200">
            <h2 className="text-2xl font-black mb-1 text-slate-900 uppercase">Editar Casa</h2>
            <p className="text-slate-500 mb-6 text-sm font-bold uppercase tracking-widest">{sideLabels[editingHouse.side]}</p>
            <input autoFocus className="w-full border-2 border-slate-200 p-4 rounded-xl mb-6 text-slate-900 text-3xl placeholder:text-slate-300 outline-none focus:border-blue-500 text-center font-black" value={editingHouseNumber} onChange={(e) => setEditingHouseNumber(e.target.value)} />
            <div className="flex gap-3">
              <button type="button" onClick={() => { setEditingHouse(null); setEditingHouseNumber(""); }} className="flex-1 py-4 text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 font-black uppercase text-sm">Cancelar</button>
              <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black uppercase text-sm">Salvar</button>
            </div>
          </form>
        </div>
      )}

      {dialogOpen && selectedHouse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl flex flex-col items-center border border-slate-200">
            <h2 className="text-6xl font-black text-slate-900 leading-none mb-2">{selectedHouse.number}</h2>
            <p className="text-slate-500 mb-8 text-sm font-bold uppercase tracking-widest">{streetNames[selectedHouse.side] || "Sem Nome"}</p>
            {selectedHouse.status === 'not_visited' ? (
              <>
                <p className="text-sm text-slate-800 mb-4 text-center font-black uppercase tracking-widest">Alguém atendeu?</p>
                <div className="grid grid-cols-2 gap-4 w-full mb-4">
                  <button onClick={() => updateHouseStatus('visited')} className="py-6 bg-green-500 text-white rounded-2xl font-black text-2xl shadow-lg border-b-4 border-green-700 hover:bg-green-600 active:translate-y-1 active:border-b-0 transition-all">SIM</button>
                  <button onClick={() => updateHouseStatus('not_answered')} className="py-6 bg-red-500 text-white rounded-2xl font-black text-2xl shadow-lg border-b-4 border-red-700 hover:bg-red-600 active:translate-y-1 active:border-b-0 transition-all">NÃO</button>
                </div>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-green-500 text-white rounded-2xl shadow-lg border-b-4 border-green-700 flex items-center justify-center mb-6">
                  <Check className="w-10 h-10" />
                </div>
                <p className="text-sm text-slate-800 mb-6 text-center font-black uppercase tracking-widest">Já Visitado</p>
                <div className="w-full flex gap-3">
                  <button onClick={() => updateHouseStatus('not_visited')} className="flex-1 py-4 text-red-600 bg-red-50 border-2 border-red-200 rounded-xl font-black uppercase text-sm hover:bg-red-100">Desfazer</button>
                  <button onClick={() => setDialogOpen(false)} className="flex-1 py-4 text-slate-500 bg-slate-100 rounded-xl font-black uppercase text-sm hover:bg-slate-200">Fechar</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AddHouseBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="min-w-[3.5rem] px-2 h-10 flex items-center justify-center rounded-[12px] border-2 border-dashed border-slate-300 text-slate-400 hover:text-blue-500 hover:border-blue-400 hover:bg-blue-50 shrink-0">
      <Plus className="w-5 h-5" />
    </button>
  );
}

function HouseBox({ h, isEditMode, deleteHouse, addBefore, addNext, handleHouseClick, isRow }: any) {
  return (
    <div className={cn("flex items-center relative shrink-0", isRow ? "flex-row gap-3" : "flex-col gap-3")}>
      {isEditMode && (
        <button onClick={(e) => { e.stopPropagation(); addBefore(); }} className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 shrink-0">
          <Plus className="w-3 h-3" />
        </button>
      )}
      <div className="relative">
        <button onClick={() => handleHouseClick(h)} className={cn("min-w-[3.5rem] max-w-[4rem] px-2 h-10 rounded-[12px] flex items-center justify-center text-white font-black text-sm shadow-sm transition-transform active:scale-95 relative overflow-hidden", h.status === 'visited' ? "bg-green-500" : "bg-[#f14646]")}>
          <span className="truncate w-full text-center leading-none">{h.number}</span>
        </button>
        {isEditMode && (
          <button onClick={(e) => { e.stopPropagation(); deleteHouse(h.id); }} className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow text-slate-400 hover:text-red-600 hover:bg-red-50">
            <Trash2 className="w-3 h-3"/>
          </button>
        )}
      </div>
      {isEditMode && (
        <button onClick={(e) => { e.stopPropagation(); addNext(); }} className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 hover:bg-blue-200 shrink-0">
          <Plus className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function StreetLabel({ side, value, editingStreet, setEditingStreet, streetNames, setStreetNames, saveStreetName, isEditMode }: any) {
  if (editingStreet === side) {
    return (
      <div className="flex items-center gap-1 z-50 bg-white p-1 rounded-full shadow-lg border border-blue-200 pointer-events-auto">
        <input autoFocus className="border-none bg-transparent w-24 px-2 text-[10px] text-slate-900 font-black uppercase outline-none focus:ring-0" value={streetNames[side] || ""} onChange={e => setStreetNames((s: any) => ({...s, [side]: e.target.value}))} />
        <button onClick={() => saveStreetName(side)} className="p-1 bg-green-500 text-white rounded-full"><Check className="w-3 h-3"/></button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <div className="bg-slate-50 text-slate-400 px-3 py-1 text-[10px] font-bold rounded-full uppercase tracking-widest shadow-sm flex items-center justify-center pointer-events-none">
        {value || "S/ NOME"}
      </div>
      {isEditMode && (
        <button onClick={() => setEditingStreet(side)} className="p-1 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors pointer-events-auto relative z-10">
          <Edit2 className="w-3 h-3"/>
        </button>
      )}
    </div>
  );
}
