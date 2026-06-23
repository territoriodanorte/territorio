"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Territory } from "@/lib/types";
import { useEditMode } from "@/components/edit-mode-provider";
import { ArrowLeft, ZoomIn, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

export default function MapPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { isEditMode, requestEditMode } = useEditMode();
  const [territory, setTerritory] = useState<Territory | null>(null);
  const [imageUrl, setImageUrl] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (!id) return;
    const unsub = onSnapshot(doc(db, "territories", id), (docObj) => {
      if (docObj.exists()) {
        const data = { id: docObj.id, ...docObj.data() } as Territory;
        setTerritory(data);
        setImageUrl(data.mapImageUrl || "");
      } else router.push("/");
    });
    return () => unsub();
  }, [id, router]);

  const saveImage = async () => {
    try {
      await updateDoc(doc(db, "territories", id), { mapImageUrl: imageUrl.trim() });
    } catch (error) { console.error(error); }
  };

  if (!territory) return <div className="p-6 text-slate-500 font-bold uppercase">Carregando...</div>;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <header className="bg-blue-600 text-white p-6 flex justify-between items-center shadow-md shrink-0">
        <div className="flex gap-4 items-center">
          <Link href="/" className="bg-blue-700 p-3 rounded-xl hover:bg-blue-800">
            <ArrowLeft className="w-6 h-6" />
          </Link>
          <div>
            <h1 className="text-4xl font-black tracking-tighter leading-none uppercase">{territory.name}</h1>
            <p className="text-sm font-bold tracking-widest opacity-80 uppercase mt-1">Mapa do Território</p>
          </div>
        </div>
        <div className="flex gap-4">
          <button onClick={requestEditMode} className="bg-white text-blue-600 px-6 py-2 rounded-md font-black text-sm uppercase shadow-sm active:scale-95 transition-transform">
            Modo Edição
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center relative">
         <div className="w-full max-w-4xl flex flex-col gap-6">
            <div className="bg-white rounded-3xl shadow-xl border border-slate-200 p-8 flex flex-col items-center">
              {territory.mapImageUrl ? (
                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border-2 border-slate-200 group cursor-zoom-in" onClick={() => setIsFullscreen(true)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={territory.mapImageUrl} alt="Mapa" className="w-full h-full object-contain bg-slate-50" />
                  <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors flex items-center justify-center">
                    <div className="bg-white p-4 rounded-xl shadow-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-4 group-hover:translate-y-0 text-blue-600 font-black flex gap-2 items-center">
                      <ZoomIn className="w-5 h-5" /> EXPANDIR MAPA
                    </div>
                  </div>
                </div>
              ) : (
                <div className="w-full aspect-video rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon className="w-16 h-16 mb-4 opacity-50" />
                  <p className="text-xl font-black uppercase tracking-widest">Nenhum mapa configurado</p>
                </div>
              )}

              {isEditMode && (
                <div className="mt-8 w-full max-w-xl bg-slate-50 border-2 border-slate-200 p-6 rounded-2xl">
                  <h3 className="font-black text-slate-900 uppercase tracking-widest text-sm mb-4">Link da Imagem</h3>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      className="flex-1 border-2 border-slate-300 rounded-xl px-4 py-3 text-slate-900 font-bold focus:border-blue-500 outline-none text-sm"
                      placeholder="https://..."
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                    />
                    <button onClick={saveImage} className="px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 font-black uppercase text-sm shrink-0">
                      Salvar Link
                    </button>
                  </div>
                </div>
              )}
            </div>
         </div>
      </main>

      {isFullscreen && territory.mapImageUrl && (
        <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col backdrop-blur-sm">
          <div className="p-6 flex justify-between items-center bg-slate-900/50">
            <h2 className="text-white font-black text-2xl uppercase tracking-widest">{territory.name} - MAPA</h2>
            <button onClick={() => setIsFullscreen(false)} className="p-3 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors">
              <X className="w-8 h-8" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center p-6 overflow-auto" onClick={() => setIsFullscreen(false)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={territory.mapImageUrl} alt="Mapa Grande" className="max-w-full max-h-[85vh] object-contain cursor-zoom-out rounded-xl" />
          </div>
        </div>
      )}
    </div>
  );
}
