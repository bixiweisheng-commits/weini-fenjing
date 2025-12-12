import React, { useState } from 'react';
import { Key, X, Info } from 'lucide-react';

interface Props {
  onSubmit: (keys: string[]) => void;
  onClose?: () => void;
  hasExistingKey: boolean;
}

export const ApiKeyInput: React.FC<Props> = ({ onSubmit, onClose, hasExistingKey }) => {
  const [inputVal, setInputVal] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const keys = inputVal
      .split('\n')
      .map(k => k.trim())
      .filter(k => k.length > 0);

    if (keys.length === 0) return;
    
    setLoading(true);
    await onSubmit(keys);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-surface border border-white/10 rounded-2xl p-8 shadow-2xl relative">
        {hasExistingKey && onClose && (
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
                <X size={20} />
            </button>
        )}
        
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center text-primary">
            <Key size={24} />
          </div>
          <h2 className="text-2xl font-bold text-white">
              API 密钥池
          </h2>
          <p className="text-gray-400 text-center text-sm">
            为了提高生成速度并避免配额限制，建议输入多个 Key。<br/>
            系统将自动在多个 Key 之间轮询。
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-2">
                <span>输入 Google Gemini API Key (一行一个)</span>
                <span>{inputVal.split('\n').filter(k=>k.trim()).length} 个密钥</span>
            </div>
            <textarea
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder={`AIzaSy...\nAIzaSy...`}
              className="w-full h-32 bg-black/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all font-mono text-xs resize-none"
              required
            />
          </div>
          
          <div className="bg-primary/10 border border-primary/20 rounded p-3 flex gap-2 items-start">
             <Info size={14} className="text-primary mt-0.5 flex-shrink-0" />
             <p className="text-[10px] text-gray-300 leading-tight">
                提示：Gemini 免费版每分钟限制 15 次请求。使用多账号的 Key 构建密钥池，可以大幅提升并发生成速度（如 3x3 九宫格）。
             </p>
          </div>

          <div className="flex gap-3 mt-4">
             {hasExistingKey && onClose && (
                 <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-surfaceHighlight hover:bg-white/10 text-white font-medium py-3 rounded-lg transition-all"
                 >
                    取消
                 </button>
             )}
             <button
                type="submit"
                disabled={loading || !inputVal.trim()}
                className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primaryHover hover:to-accent text-white font-medium py-3 rounded-lg transition-all transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  '验证并保存'
                )}
              </button>
          </div>
        </form>
        <div className="mt-6 text-center">
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-xs text-gray-500 hover:text-primary transition-colors">
                获取 Google AI Studio API 密钥
            </a>
        </div>
      </div>
    </div>
  );
};