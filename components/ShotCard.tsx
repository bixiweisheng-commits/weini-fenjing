import React from 'react';
import { Shot } from '../types';
import { RefreshCw } from 'lucide-react';

interface Props {
  shot: Shot;
  isSelected: boolean;
  onClick: () => void;
  onRegenerate: (e: React.MouseEvent) => void;
}

export const ShotCard: React.FC<Props> = ({ shot, isSelected, onClick, onRegenerate }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative aspect-video bg-surfaceHighlight rounded-lg overflow-hidden cursor-pointer group transition-all duration-200
        ${isSelected ? 'ring-2 ring-primary shadow-lg shadow-primary/20' : 'border border-white/5 hover:border-white/20'}
      `}
    >
      {shot.isGenerating ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-surface">
           <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
           <p className="text-[10px] text-gray-500 uppercase tracking-widest animate-pulse">渲染中</p>
        </div>
      ) : shot.imageUrl ? (
        <>
            <img 
              src={shot.imageUrl} 
              alt="Storyboard shot" 
              className="w-full h-full object-cover"
            />
            {/* Hover Actions */}
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={onRegenerate}
                    className="p-1.5 bg-black/60 hover:bg-primary text-white rounded backdrop-blur-md transition-colors"
                    title="重新生成此镜头"
                >
                    <RefreshCw size={14} />
                </button>
            </div>
        </>
      ) : shot.error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-red-500 p-2 text-center text-xs bg-surface gap-2">
          <span>{shot.error}</span>
          <button onClick={onRegenerate} className="px-2 py-1 bg-white/10 rounded hover:bg-white/20 text-white flex items-center gap-1">
             <RefreshCw size={12} /> 重试
          </button>
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-gray-700 text-xs bg-surface">
          等待中
        </div>
      )}
      
      {/* Selection Overlay */}
      <div className={`absolute inset-0 bg-primary/10 transition-opacity pointer-events-none ${isSelected ? 'opacity-100' : 'opacity-0'}`} />
    </div>
  );
};