import React, { useState, useEffect } from 'react';
import { initGemini, validateApiKey, planStoryboard, generateShotImage, editShotImage, getClientCount } from './services/geminiService';
import { ApiKeyInput } from './components/ApiKeyInput';
import { LeftSidebar } from './components/LeftSidebar';
import { RightSidebar } from './components/RightSidebar';
import { ShotCard } from './components/ShotCard';
import { EditShotModal } from './components/EditShotModal';
import { Asset, Shot, AspectRatio, GridSize, QualityLevel } from './types';
import { Layout, Download, Grid, Key } from 'lucide-react';
import JSZip from 'jszip';

const App: React.FC = () => {
  const [hasKey, setHasKey] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  
  // State
  const [shots, setShots] = useState<Shot[]>([]);
  const [prompt, setPrompt] = useState('');
  const [gridSize, setGridSize] = useState<GridSize>(2); 
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [quality, setQuality] = useState<QualityLevel>('standard');
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingShot, setEditingShot] = useState<Shot | null>(null);
  const [selectedShotId, setSelectedShotId] = useState<string | null>(null);

  // Initialize API from localStorage if available
  useEffect(() => {
    const storedKeysJson = localStorage.getItem('gemini_api_keys');
    const storedSingleKey = localStorage.getItem('gemini_api_key'); // Backward compatibility
    
    if (storedKeysJson) {
        try {
            const keys = JSON.parse(storedKeysJson);
            if (Array.isArray(keys) && keys.length > 0) {
                initGemini(keys);
                setHasKey(true);
                return;
            }
        } catch(e) { /* ignore */ }
    }
    
    // Fallback to single key if legacy exists
    if (storedSingleKey) {
       initGemini([storedSingleKey]);
       setHasKey(true);
       // Upgrade storage
       localStorage.setItem('gemini_api_keys', JSON.stringify([storedSingleKey]));
    } else {
       setShowKeyModal(true);
    }
  }, []);

  const handleApiKeySubmit = async (keys: string[]) => {
    // Validate the first one at least to ensure basic connectivity
    // We assume if user pastes multiple, they know what they are doing, but we validate one.
    const isValid = await validateApiKey(keys[0]);
    if (isValid) {
      setHasKey(true);
      localStorage.setItem('gemini_api_keys', JSON.stringify(keys));
      // Clear legacy
      localStorage.removeItem('gemini_api_key');
      initGemini(keys);
      setShowKeyModal(false);
    } else {
      alert('第一个 API 密钥验证失败。请检查您的密钥。');
    }
  };

  const handleChangeKey = () => {
      setShowKeyModal(true);
  };

  const handleUpdateShot = (id: string, updates: Partial<Shot>) => {
    setShots(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setSelectedShotId(null);

    try {
      setShots([]); 

      const totalShots = gridSize * gridSize;
      const placeholderShots: Shot[] = Array.from({ length: totalShots }).map(() => ({
        id: crypto.randomUUID(),
        description: "规划分镜中...",
        isGenerating: true,
        aspectRatio,
        shotType: 'Planning'
      }));
      setShots(placeholderShots);

      const plannedShotsData = await planStoryboard(prompt, gridSize, assets);

      const plannedShots: Shot[] = plannedShotsData.map((s, idx) => ({
        ...s,
        id: placeholderShots[idx]?.id || crypto.randomUUID(),
        aspectRatio
      }));
      setShots(plannedShots);

      if (plannedShots.length > 0) {
        setSelectedShotId(plannedShots[0].id);
      }

      // --- DYNAMIC CONCURRENCY QUEUE ---
      const clientCount = getClientCount();
      // Strict limit: 1 request per key. This is the safest for Free Tier.
      // If you have 3 keys, you get 3 concurrent requests.
      const CONCURRENCY_LIMIT = Math.max(1, clientCount);
      
      console.log(`Starting generation with ${clientCount} keys. Concurrency limit: ${CONCURRENCY_LIMIT}`);

      // Queue of shots to generate
      const queue = [...plannedShots];
      // Active workers
      const activePromises: Promise<void>[] = [];

      // Worker function
      const processNext = async () => {
          if (queue.length === 0) return;
          const shot = queue.shift();
          if (!shot) return;

          try {
             const imageUrl = await generateShotImage(shot, assets, quality, false);
             setShots(prev => {
                const newShots = [...prev];
                const targetIdx = newShots.findIndex(s => s.id === shot.id);
                if (targetIdx !== -1) {
                    newShots[targetIdx] = { ...shot, imageUrl, isGenerating: false };
                }
                return newShots;
             });
          } catch (error: any) {
             console.error(`Error generating shot:`, error);
             const isRateLimit = error.message?.includes('429') || error.status === 429;
             const isXhrError = error.message?.includes('xhr') || error.code === 6;
             
             let errorMsg = '生成失败';
             if (isRateLimit) errorMsg = '配额受限';
             if (isXhrError) errorMsg = '网络错误';
             
             setShots(prev => {
                const newShots = [...prev];
                const targetIdx = newShots.findIndex(s => s.id === shot.id);
                if (targetIdx !== -1) {
                    newShots[targetIdx] = { ...shot, isGenerating: false, error: errorMsg };
                }
                return newShots;
             });
          }
      };

      // Queue Processor
      while (queue.length > 0 || activePromises.length > 0) {
          // Fill the pool up to the limit
          while (queue.length > 0 && activePromises.length < CONCURRENCY_LIMIT) {
              const p = processNext().then(() => {
                  // When a promise finishes, remove it from active list
                  const idx = activePromises.indexOf(p);
                  if (idx > -1) activePromises.splice(idx, 1);
              });
              activePromises.push(p);
              
              // Small stagger delay to prevent exact millisecond bursts
              await new Promise(r => setTimeout(r, 200)); 
          }

          if (activePromises.length === 0 && queue.length === 0) break;
          
          // Wait for at least one worker to free up
          await Promise.race(activePromises);
      }

    } catch (error: any) {
      console.error("Storyboard generation failed", error);
      alert(`生成分镜失败: ${error.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerateShot = async (id: string) => {
    const shotIndex = shots.findIndex(s => s.id === id);
    if (shotIndex === -1) return;

    const shot = shots[shotIndex];
    const newShots = [...shots];
    newShots[shotIndex] = { ...shot, isGenerating: true, error: undefined };
    setShots(newShots);

    try {
      const imageUrl = await generateShotImage(shot, assets, quality, true);
      newShots[shotIndex] = { ...shot, imageUrl, isGenerating: false };
      setShots([...newShots]);
    } catch (e: any) {
      const errorMsg = e.message?.includes('429') ? "配额超限" : "重试失败";
      newShots[shotIndex] = { ...shot, isGenerating: false, error: errorMsg };
      setShots([...newShots]);
    }
  };

  const handleApplyEdit = async (shotId: string, instruction: string) => {
    const shotIndex = shots.findIndex(s => s.id === shotId);
    if (shotIndex === -1) return;

    const shot = shots[shotIndex];
    if (!shot.imageUrl) return;

    const newShots = [...shots];
    newShots[shotIndex] = { ...shot, isGenerating: true };
    setShots(newShots);

    try {
      const editedUrl = await editShotImage(shot.imageUrl, instruction);
      newShots[shotIndex] = { ...shot, imageUrl: editedUrl, isGenerating: false };
      setShots([...newShots]);
    } catch (e) {
        console.error(e);
        newShots[shotIndex] = { ...shot, isGenerating: false, error: "编辑失败" };
        setShots([...newShots]);
    }
  };

  const handleDeleteShot = (id: string) => {
    setShots(shots.filter(s => s.id !== id));
    if (selectedShotId === id) setSelectedShotId(null);
  };

  const handleDownloadAll = async () => {
    const imagesToDownload = shots.filter(s => s.imageUrl);
    if (imagesToDownload.length === 0) {
        alert('没有可下载的图像');
        return;
    }

    const zip = new JSZip();
    let count = 0;

    imagesToDownload.forEach((shot, index) => {
        if (shot.imageUrl) {
            const base64Data = shot.imageUrl.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");
            const filename = `shot-${index + 1}-${shot.shotType?.replace(/\s+/g, '-') || 'scene'}.png`;
            zip.file(filename, base64Data, {base64: true});
            count++;
        }
    });

    try {
        const content = await zip.generateAsync({type:"blob"});
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `storyboard-${new Date().toISOString().slice(0,10)}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (e) {
        console.error("Zip generation failed", e);
        alert("打包下载失败");
    }
  };

  const selectedShot = shots.find(s => s.id === selectedShotId) || null;

  return (
    <div className="flex h-screen bg-background text-white overflow-hidden font-sans">
      <LeftSidebar 
        prompt={prompt}
        setPrompt={setPrompt}
        onGenerate={handleGenerate}
        isGenerating={isGenerating}
        gridSize={gridSize}
        setGridSize={setGridSize}
        aspectRatio={aspectRatio}
        setAspectRatio={setAspectRatio}
        quality={quality}
        setQuality={setQuality}
        assets={assets}
        onAddAsset={(a) => setAssets([...assets, a])}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden bg-black/50 relative">
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 bg-[#09090b]">
           <div className="flex items-center gap-2">
               <h2 className="text-lg font-bold text-white">画布</h2>
               <span className="text-sm text-gray-500">{shots.length} 个镜头</span>
           </div>
           
           <div className="flex items-center gap-4">
               <button 
                  onClick={handleChangeKey}
                  className="flex items-center gap-2 bg-white/5 hover:bg-primary/20 hover:text-primary px-3 py-1.5 rounded-lg text-xs text-gray-300 transition-all border border-white/5"
                  title="更换 API Key"
               >
                   <Key size={14} />
                   <span>API 设置 ({getClientCount()} keys)</span>
               </button>

               <div className="h-4 w-[1px] bg-white/10"></div>

               <button className="p-2 text-gray-400 hover:text-white rounded hover:bg-white/5">
                   <Grid size={18} />
               </button>
               <button 
                  onClick={handleDownloadAll}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-xs text-gray-300 transition-colors"
                  title="下载所有镜头 (ZIP)"
               >
                   <Download size={14} />
                   <span>打包下载</span>
               </button>
           </div>
        </div>

        <main className="flex-1 overflow-y-auto p-8 relative">
            <div className="absolute inset-0 bg-[radial-gradient(#1f1f22_1px,transparent_1px)] [background-size:20px_20px] opacity-20 pointer-events-none"></div>

            {shots.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-600 gap-4 opacity-50">
                    <Layout size={64} strokeWidth={1} />
                    <p className="font-light text-sm">画布为空，请在左侧生成分镜</p>
                </div>
            ) : (
                <div 
                    className="grid gap-6 w-full max-w-6xl mx-auto transition-all"
                    style={{
                        gridTemplateColumns: `repeat(${gridSize}, minmax(0, 1fr))`,
                    }}
                >
                    {shots.map((shot) => (
                        <ShotCard 
                            key={shot.id} 
                            shot={shot} 
                            isSelected={selectedShotId === shot.id}
                            onClick={() => setSelectedShotId(shot.id)}
                            onRegenerate={(e) => {
                                e.stopPropagation();
                                handleRegenerateShot(shot.id);
                            }}
                        />
                    ))}
                </div>
            )}
        </main>
      </div>

      <RightSidebar 
        shot={selectedShot}
        onClose={() => setSelectedShotId(null)}
        onRegenerate={handleRegenerateShot}
        onEdit={setEditingShot}
        onUpdateShot={handleUpdateShot}
      />

      <EditShotModal 
        shot={editingShot} 
        onClose={() => setEditingShot(null)}
        onApplyEdit={handleApplyEdit}
      />
      
      {showKeyModal && (
        <ApiKeyInput 
            onSubmit={(k) => handleApiKeySubmit(k)} 
            hasExistingKey={hasKey}
            onClose={hasKey ? () => setShowKeyModal(false) : undefined}
        />
      )}
    </div>
  );
};

export default App;