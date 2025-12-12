import React, { useRef } from 'react';
import { Grid2X2, Grid3X3, Plus, Image as ImageIcon, Sparkles, LayoutGrid, X } from 'lucide-react';
import { Asset, AssetType, AspectRatio, GridSize, QualityLevel } from '../types';

interface Props {
  prompt: string;
  setPrompt: (s: string) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  gridSize: GridSize;
  setGridSize: (s: GridSize) => void;
  aspectRatio: AspectRatio;
  setAspectRatio: (a: AspectRatio) => void;
  quality: QualityLevel;
  setQuality: (q: QualityLevel) => void;
  assets: Asset[];
  onAddAsset: (a: Asset) => void;
  onRemoveAsset: (id: string) => void;
}

export const LeftSidebar: React.FC<Props> = ({
  prompt, setPrompt, onGenerate, isGenerating,
  gridSize, setGridSize,
  aspectRatio, setAspectRatio,
  quality, setQuality,
  assets, onAddAsset, onRemoveAsset
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      onAddAsset({
        id: crypto.randomUUID(),
        type: AssetType.CHARACTER,
        url: reader.result as string,
        name: file.name.split('.')[0]
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const ratios: AspectRatio[] = ['1:1', '4:3', '16:9', '9:16', '21:9'];

  return (
    <div className="w-[320px] bg-[#09090b] border-r border-white/10 flex flex-col h-full flex-shrink-0">
      {/* Header */}
      <div className="h-16 flex items-center px-5 border-b border-white/10">
        <h1 className="text-xl font-bold tracking-tight text-white">
          欢玺 <span className="text-primary font-light">AI</span>
        </h1>
        <span className="ml-2 text-[10px] text-gray-500 uppercase tracking-wider border border-white/10 px-1.5 py-0.5 rounded">工作台</span>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-8">
        {/* Director's Console Section */}
        <div>
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">导演控制台</h2>
          
          {/* Composition */}
          <div className="space-y-4">
            <div>
                <label className="text-xs text-gray-500 mb-2 block">画面构图</label>
                <div className="grid grid-cols-2 gap-2">
                    <button 
                        onClick={() => setGridSize(2)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-sm transition-all ${gridSize === 2 ? 'bg-surfaceHighlight border-primary/50 text-white' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}
                    >
                        <Grid2X2 size={16} /> 2x2
                    </button>
                    <button 
                        onClick={() => setGridSize(3)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-sm transition-all ${gridSize === 3 ? 'bg-surfaceHighlight border-primary/50 text-white' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}
                    >
                        <Grid3X3 size={16} /> 3x3
                    </button>
                    <button 
                        onClick={() => setGridSize(4)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-sm transition-all ${gridSize === 4 ? 'bg-surfaceHighlight border-primary/50 text-white' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}
                    >
                        <LayoutGrid size={16} /> 4x4
                    </button>
                    <button 
                        onClick={() => setGridSize(5)}
                        className={`flex items-center justify-center gap-2 py-3 rounded-lg border text-sm transition-all ${gridSize === 5 ? 'bg-surfaceHighlight border-primary/50 text-white' : 'border-white/10 text-gray-400 hover:bg-white/5'}`}
                    >
                        <LayoutGrid size={16} /> 5x5
                    </button>
                </div>
            </div>

            <div>
                <label className="text-xs text-gray-500 mb-2 block">画面比例</label>
                <div className="flex flex-wrap gap-2">
                    {ratios.map(r => (
                        <button
                            key={r}
                            onClick={() => setAspectRatio(r)}
                            className={`px-3 py-1.5 rounded-full text-xs border transition-all ${aspectRatio === r ? 'bg-primary text-white border-primary' : 'bg-transparent border-white/10 text-gray-400 hover:border-white/30'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
            </div>
          </div>
        </div>

        {/* References */}
        <div>
           <div className="flex items-center justify-between mb-2">
               <label className="text-xs text-gray-500">参考素材</label>
               <button onClick={() => fileInputRef.current?.click()} className="text-primary hover:text-white transition-colors">
                   <Plus size={14} />
               </button>
           </div>
           <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
           
           <div className="grid grid-cols-4 gap-2">
               {assets.map(a => (
                   <div key={a.id} className="aspect-square bg-surfaceHighlight rounded overflow-hidden border border-white/5 relative group">
                       <img src={a.url} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                       <button 
                           onClick={(e) => { e.stopPropagation(); onRemoveAsset(a.id); }}
                           className="absolute top-0 right-0 p-0.5 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                       >
                           <X size={10} />
                       </button>
                   </div>
               ))}
               <button onClick={() => fileInputRef.current?.click()} className="aspect-square bg-black/20 rounded border border-white/10 border-dashed flex items-center justify-center text-gray-600 hover:text-gray-400 hover:border-white/20 transition-all">
                   <ImageIcon size={14} />
               </button>
           </div>
        </div>

        {/* Output Quality */}
        <div>
            <label className="text-xs text-gray-500 mb-2 block">输出画质</label>
            <div className="grid grid-cols-3 gap-1 bg-surfaceHighlight p-1 rounded-lg border border-white/10">
                <button
                    onClick={() => setQuality('standard')}
                    className={`text-[10px] py-1.5 rounded-md transition-all ${quality === 'standard' ? 'bg-surface text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    标准
                </button>
                <button
                    onClick={() => setQuality('hd')}
                    className={`text-[10px] py-1.5 rounded-md transition-all ${quality === 'hd' ? 'bg-surface text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    高清 HD
                </button>
                <button
                    onClick={() => setQuality('4k')}
                    className={`text-[10px] py-1.5 rounded-md transition-all ${quality === '4k' ? 'bg-surface text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                >
                    4K 超清
                </button>
            </div>
        </div>
      </div>

      {/* Footer Input */}
      <div className="p-5 border-t border-white/10 bg-surface/50">
        <label className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-2 block">分镜描述</label>
        <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="描述你的场景：(角色、动作、氛围)..."
            className="w-full h-32 bg-black/40 border border-white/10 rounded-lg p-3 text-sm text-gray-300 focus:outline-none focus:border-primary/50 resize-none mb-3"
        />
        <button
            onClick={onGenerate}
            disabled={isGenerating || !prompt}
            className="w-full bg-primary hover:bg-primaryHover text-white py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:shadow-none"
        >
            {isGenerating ? (
                <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    生成中...
                </>
            ) : (
                <>
                    <Sparkles size={16} />
                    生成分镜
                </>
            )}
        </button>
      </div>
    </div>
  );
};