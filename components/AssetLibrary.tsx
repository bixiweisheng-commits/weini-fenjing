import React, { useRef } from 'react';
import { Asset, AssetType } from '../types';
import { Upload, X, Image as ImageIcon, User, Box } from 'lucide-react';

interface Props {
  assets: Asset[];
  onAddAsset: (asset: Asset) => void;
  onRemoveAsset: (id: string) => void;
}

export const AssetLibrary: React.FC<Props> = ({ assets, onAddAsset, onRemoveAsset }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      onAddAsset({
        id: crypto.randomUUID(),
        type: AssetType.CHARACTER, // Default, user can change later if we add that UI
        url: base64,
        name: file.name.split('.')[0]
      });
    };
    reader.readAsDataURL(file);
    
    // Reset
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const getIcon = (type: AssetType) => {
    switch (type) {
        case AssetType.CHARACTER: return <User size={14} />;
        case AssetType.SCENE: return <ImageIcon size={14} />;
        case AssetType.ELEMENT: return <Box size={14} />;
    }
  };

  return (
    <div className="h-full flex flex-col bg-surface border-r border-white/5 w-72 flex-shrink-0">
      <div className="p-4 border-b border-white/5">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider mb-4">素材库</h2>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/5 text-sm text-gray-200 py-2.5 rounded-lg transition-all"
        >
          <Upload size={16} />
          上传参考图
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          className="hidden" 
          accept="image/*"
          onChange={handleFileUpload}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {assets.length === 0 && (
          <div className="text-center py-10 opacity-30">
            <ImageIcon size={32} className="mx-auto mb-2" />
            <p className="text-xs">暂无素材</p>
          </div>
        )}
        
        {assets.map(asset => (
          <div key={asset.id} className="group relative bg-black/40 border border-white/5 rounded-lg overflow-hidden transition-all hover:border-primary/50">
            <div className="aspect-square w-full">
                <img src={asset.url} alt={asset.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                    onClick={() => onRemoveAsset(asset.id)}
                    className="p-1 bg-black/80 text-red-400 rounded hover:bg-red-500/20"
                >
                    <X size={12} />
                </button>
            </div>
            <div className="p-2">
                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
                    {getIcon(asset.type)}
                    <span className="font-medium">{asset.type}</span>
                </div>
                <p className="text-xs text-white truncate" title={asset.name}>{asset.name}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};