import React, { useState } from 'react';
import { Shot } from '../types';
import { X, Wand2 } from 'lucide-react';

interface Props {
  shot: Shot | null;
  onClose: () => void;
  onApplyEdit: (shotId: string, instruction: string) => Promise<void>;
}

export const EditShotModal: React.FC<Props> = ({ shot, onClose, onApplyEdit }) => {
  const [instruction, setInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!shot) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!instruction.trim()) return;

    setIsProcessing(true);
    await onApplyEdit(shot.id, instruction);
    setIsProcessing(false);
    setInstruction('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div className="w-full max-w-2xl bg-surface border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-surfaceHighlight/30">
            <h3 className="text-lg font-medium text-white flex items-center gap-2">
                <Wand2 size={18} className="text-accent" />
                魔法编辑
            </h3>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors">
                <X size={20} />
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center gap-6">
            <div className="relative rounded-lg overflow-hidden border border-white/10 shadow-lg max-h-[400px]">
                <img src={shot.imageUrl} alt="Original" className="w-full h-full object-contain" />
            </div>
            
            <form onSubmit={handleSubmit} className="w-full">
                <label className="block text-sm text-gray-400 mb-2">编辑指令</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        placeholder="例如：下雨天，添加镜头光晕，背景变红..."
                        className="flex-1 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-accent/50 transition-colors"
                        autoFocus
                    />
                    <button 
                        type="submit" 
                        disabled={isProcessing || !instruction.trim()}
                        className="bg-accent hover:bg-violet-600 text-white px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {isProcessing ? '编辑中...' : '应用'}
                    </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                    由 Gemini 2.5 Flash Image 驱动。描述你想要改变的内容。
                </p>
            </form>
        </div>
      </div>
    </div>
  );
};