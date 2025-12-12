import React, { useState } from 'react';
import { Shot } from '../types';
import { Download, RefreshCw, Zap, X, Copy, Info, BarChart3, Edit2 } from 'lucide-react';

interface Props {
  shot: Shot | null;
  onClose: () => void;
  onRegenerate: (id: string) => void;
  onEdit: (shot: Shot) => void;
  onUpdateShot: (id: string, updates: Partial<Shot>) => void;
}

export const RightSidebar: React.FC<Props> = ({ shot, onClose, onRegenerate, onEdit, onUpdateShot }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'analysis'>('details');

  if (!shot) return null;

  const handleDownload = () => {
    if (!shot.imageUrl) return;
    const link = document.createElement('a');
    link.href = shot.imageUrl;
    link.download = `shot-${shot.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-[320px] bg-[#09090b] border-l border-white/10 flex flex-col h-full flex-shrink-0 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="h-16 flex items-center justify-between px-5 border-b border-white/10">
        <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white">检查器</h2>
            <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] rounded">
                {activeTab === 'details' ? '属性' : 'AI分析'}
            </span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {/* Preview Image */}
        <div className="w-full aspect-video bg-surfaceHighlight rounded-lg border border-white/10 overflow-hidden mb-4 relative group">
            {shot.imageUrl ? (
                <img src={shot.imageUrl} alt="Preview" className="w-full h-full object-contain bg-black/50" />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">无预览</div>
            )}
            
            {/* Quick Actions overlay */}
            <div className="absolute top-2 right-2 flex flex-col gap-2">
                 <button onClick={() => onEdit(shot)} className="p-2 bg-black/60 hover:bg-primary text-white rounded-lg backdrop-blur-sm transition-all" title="魔法编辑">
                     <Zap size={14} />
                 </button>
                 <button onClick={() => onRegenerate(shot.id)} className="p-2 bg-black/60 hover:bg-primary text-white rounded-lg backdrop-blur-sm transition-all" title="重新生成">
                     <RefreshCw size={14} />
                 </button>
            </div>
        </div>

        {/* Tabs (Visual) */}
        <div className="flex gap-1 bg-surfaceHighlight p-1 rounded-lg mb-6">
            <button 
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-1.5 text-xs rounded shadow-sm text-center font-medium transition-all ${activeTab === 'details' ? 'bg-surface text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                详情
            </button>
            <button 
                onClick={() => setActiveTab('analysis')}
                className={`flex-1 py-1.5 text-xs rounded shadow-sm text-center font-medium transition-all ${activeTab === 'analysis' ? 'bg-surface text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                AI 分析
            </button>
        </div>

        {activeTab === 'details' ? (
            <>
                {/* Information Grid */}
                <div className="mb-6">
                    <h3 className="text-xs text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-1">
                        <Info size={12} /> 基本信息
                    </h3>
                    <div className="grid grid-cols-2 gap-4 bg-surfaceHighlight/50 p-4 rounded-lg border border-white/5">
                        <div>
                            <label className="text-[10px] text-gray-500 block mb-1">景别</label>
                            <span className="text-xs text-white bg-white/5 px-2 py-0.5 rounded">{shot.shotType || 'Standard'}</span>
                        </div>
                        <div>
                            <label className="text-[10px] text-gray-500 block mb-1">画面比例</label>
                            <span className="text-xs text-white">{shot.aspectRatio}</span>
                        </div>
                        <div className="col-span-2">
                            <label className="text-[10px] text-gray-500 block mb-1">视觉风格</label>
                            <span className="text-xs text-gray-300">{shot.visualStyle || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Prompt */}
                <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-xs text-gray-500 uppercase tracking-widest flex items-center gap-1">
                            提示词 <span className="text-[10px] text-gray-600 normal-case">(可编辑)</span>
                        </h3>
                        <button 
                            onClick={() => navigator.clipboard.writeText(shot.description)}
                            className="flex items-center gap-1 text-[10px] text-primary hover:text-primaryHover"
                        >
                            <Copy size={10} /> 复制
                        </button>
                    </div>
                    <div className="bg-surfaceHighlight border border-white/5 rounded-lg p-1 group focus-within:ring-1 focus-within:ring-primary/50 transition-all">
                        <textarea
                            value={shot.description}
                            onChange={(e) => onUpdateShot(shot.id, { description: e.target.value })}
                            className="w-full min-h-[100px] bg-transparent text-xs text-gray-300 leading-relaxed font-light p-3 focus:outline-none resize-none"
                            placeholder="输入镜头描述..."
                        />
                    </div>
                    <p className="text-[10px] text-gray-500 mt-2">
                        提示：修改描述后点击上方图片的“重新生成”按钮即可应用变更。
                    </p>
                </div>

                {/* Main Actions */}
                <button 
                    onClick={handleDownload}
                    disabled={!shot.imageUrl}
                    className="w-full bg-surfaceHighlight hover:bg-surfaceHighlight/80 border border-white/10 text-white py-2.5 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Download size={16} />
                    下载文件
                </button>
            </>
        ) : (
            /* AI Analysis Tab Content */
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="bg-surfaceHighlight/30 border border-white/5 rounded-lg p-4">
                     <h3 className="text-xs text-primary uppercase tracking-widest mb-3 flex items-center gap-2">
                        <BarChart3 size={12} /> 视觉构成
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                <span>光照强度</span>
                                <span>75%</span>
                            </div>
                            <div className="h-1 bg-surface rounded-full overflow-hidden">
                                <div className="h-full bg-yellow-500/50 w-3/4"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                <span>色彩饱和度</span>
                                <span>45%</span>
                            </div>
                            <div className="h-1 bg-surface rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500/50 w-[45%]"></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between text-[10px] text-gray-400 mb-1">
                                <span>动态模糊</span>
                                <span>20%</span>
                            </div>
                            <div className="h-1 bg-surface rounded-full overflow-hidden">
                                <div className="h-full bg-purple-500/50 w-[20%]"></div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-surfaceHighlight/30 border border-white/5 rounded-lg p-4">
                    <h3 className="text-xs text-primary uppercase tracking-widest mb-2">导演建议</h3>
                    <p className="text-xs text-gray-400 leading-relaxed">
                        该镜头使用 <strong>{shot.shotType}</strong> 景别，建议在剪辑时与特写镜头衔接，以增强情感张力。当前光照设置适合营造{shot.visualStyle?.includes('暗') ? '压抑' : '自然'}的氛围。
                    </p>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};