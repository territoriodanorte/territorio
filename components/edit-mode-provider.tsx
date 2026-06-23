"use client";

import React, { createContext, useContext, useState } from "react";
import { Lock, Unlock } from "lucide-react";

interface EditModeContextType {
  isEditMode: boolean;
  requestEditMode: () => void;
  disableEditMode: () => void;
}

const EditModeContext = createContext<EditModeContextType | undefined>(undefined);

export function EditModeProvider({ children }: { children: React.ReactNode }) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const requestEditMode = () => {
    setShowPrompt(true);
  };

  const disableEditMode = () => {
    setIsEditMode(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "8318") {
      setIsEditMode(true);
      setShowPrompt(false);
      setPassword("");
      setError(false);
    } else {
      setError(true);
    }
  };

  return (
    <EditModeContext.Provider value={{ isEditMode, requestEditMode, disableEditMode }}>
      {children}
      {showPrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl border border-slate-200">
            <h2 className="text-2xl font-black mb-2 text-slate-900 uppercase tracking-tighter">Modo de Edição</h2>

            <form onSubmit={handleSubmit}>
              <input
                type="password"
                autoFocus
                className="w-full border-2 border-slate-200 p-4 rounded-xl mb-4 text-slate-900 placeholder:text-slate-400 font-bold outline-none focus:border-blue-500 transition-colors"
                placeholder="****"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && <p className="text-red-600 text-xs font-bold uppercase tracking-widest mb-4">Senha incorreta.</p>}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPrompt(false)}
                  className="flex-1 py-3 text-slate-500 hover:bg-slate-100 rounded-xl font-black uppercase text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-black uppercase text-sm shadow-sm"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </EditModeContext.Provider>
  );
}

export function useEditMode() {
  const context = useContext(EditModeContext);
  if (context === undefined) {
    throw new Error("useEditMode must be used within an EditModeProvider");
  }
  return context;
}

export function EditModeToggle() {
  const { isEditMode, requestEditMode, disableEditMode } = useEditMode();

  return (
    <button
      onClick={isEditMode ? disableEditMode : requestEditMode}
      className={`absolute bottom-6 right-6 p-4 rounded-2xl shadow-xl font-black flex items-center gap-2 transition-transform active:scale-95 ${
        isEditMode ? "bg-red-600 text-white" : "bg-slate-900 text-white"
      }`}
      title="Alternar Modo Edição"
    >
      {isEditMode ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
    </button>
  );
}
