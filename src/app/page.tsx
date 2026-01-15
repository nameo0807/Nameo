'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Loader2, RefreshCw, Download, ChevronRight, Check } from 'lucide-react';

type Step = 'step1' | 'step2' | 'step3' | 'step4';

interface StepData {
  step1: {
    theme: string;
    style: string;
    result: string;
  };
  step2: {
    title: string;
    outline: string;
    worldAndCharactersRequirements: string;
    result: string;
  };
  step3: {
    worldAndCharacters: string;
    volumes: string;
    chaptersPerVolume: string;
    totalChapters: string;
    result: string;
  };
  step4: {
    chapterOutline: string;
    selectedChapter: string;
    result: string;
  };
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>('step1');
  const [isGenerating, setIsGenerating] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 存储每一步的数据
  const [data, setData] = useState<StepData>({
    step1: { theme: '', style: '', result: '' },
    step2: { title: '', outline: '', worldAndCharactersRequirements: '', result: '' },
    step3: { worldAndCharacters: '', volumes: '', chaptersPerVolume: '', totalChapters: '', result: '' },
    step4: { chapterOutline: '', selectedChapter: '', result: '' },
  });

  // 从结果中提取标题
  const extractTitle = (result: string): string => {
    const match = result.match(/# 小说标题\s*\n+([^\n]+)/);
    return match ? match[1].trim() : '';
  };

  // 从结果中提取大纲
  const extractOutline = (result: string): string => {
    const match = result.match(/# 小说大纲\s*\n+([\s\S]*)/);
    return match ? match[1].trim() : '';
  };

  // 提取章节列表
  const extractChapters = (result: string): Array<{ number: string; title: string }> => {
    const chapters: Array<{ number: string; title: string }> = [];
    const regex = /第(\d+)章[：:]\s*([^\n]+)/g;
    let match;
    while ((match = regex.exec(result)) !== null) {
      chapters.push({ number: match[1], title: match[2].trim() });
    }
    return chapters;
  };

  // 通用生成函数
  const generateContent = async (mode: Step, payload: any) => {
    setIsGenerating(true);

    try {
      abortControllerRef.current = new AbortController();

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('生成失败');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法读取响应');
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6);
            if (dataStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.content) {
                fullContent += parsed.content;
                setData(prev => ({
                  ...prev,
                  [mode]: { ...prev[mode], result: fullContent }
                }));
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              console.error('解析错误:', e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('生成错误:', error);
        alert(error.message || '生成失败，请重试');
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  // 步骤1：生成标题和大纲
  const handleStep1Generate = () => {
    if (!data.step1.theme.trim() || !data.step1.style.trim()) {
      alert('请填写主题和风格');
      return;
    }
    generateContent('step1', {
      mode: 'titleAndOutline',
      theme: data.step1.theme,
      style: data.step1.style,
    });
  };

  const handleStep1Next = () => {
    if (!data.step1.result) {
      alert('请先生成标题和大纲');
      return;
    }

    const title = extractTitle(data.step1.result);
    const outline = extractOutline(data.step1.result);

    setData(prev => ({
      ...prev,
      step2: { ...prev.step2, title, outline }
    }));
    setCurrentStep('step2');
  };

  // 步骤2：生成世界和人物设定
  const handleStep2Generate = () => {
    generateContent('step2', {
      mode: 'worldAndCharacters',
      theme: data.step1.theme,
      style: data.step1.style,
      title: data.step2.title,
      outline: data.step2.outline,
      worldAndCharactersRequirements: data.step2.worldAndCharactersRequirements,
    });
  };

  const handleStep2Next = () => {
    if (!data.step2.result) {
      alert('请先生成世界和人物设定');
      return;
    }
    setCurrentStep('step3');
  };

  // 步骤3：生成分章细纲
  const handleStep3Generate = () => {
    generateContent('step3', {
      mode: 'chapterOutline',
      title: data.step2.title,
      outline: data.step2.outline,
      worldAndCharacters: data.step2.result,
      volumes: data.step3.volumes,
      chaptersPerVolume: data.step3.chaptersPerVolume,
      totalChapters: data.step3.totalChapters,
    });
  };

  const handleStep3Next = () => {
    if (!data.step3.result) {
      alert('请先生成分章细纲');
      return;
    }
    setCurrentStep('step4');
  };

  // 步骤4：生成章节正文
  const handleStep4Generate = () => {
    if (!data.step4.selectedChapter) {
      alert('请选择要创作的章节');
      return;
    }
    generateContent('step4', {
      mode: 'chapterContent',
      title: data.step2.title,
      chapterNumber: data.step4.selectedChapter,
      chapterOutline: data.step3.result,
      worldAndCharacters: data.step2.result,
    });
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGenerating(false);
  };

  const handleDownload = () => {
    const contentToDownload = data.step4.result || data.step3.result || data.step2.result || data.step1.result;
    if (!contentToDownload) return;

    const blob = new Blob([contentToDownload], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${data.step2.title || '小说内容'}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const chapters = extractChapters(data.step3.result);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 头部 */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-50">
              AI 小说生成平台
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            渐进式创作：标题/大纲 → 世界/人物设定 → 分章细纲 → 章节正文
          </p>
        </div>

        {/* 步骤指示器 */}
        <div className="flex items-center justify-center mb-8">
          {[
            { id: 'step1', label: '标题/大纲' },
            { id: 'step2', label: '世界/人物' },
            { id: 'step3', label: '分章细纲' },
            { id: 'step4', label: '章节正文' }
          ].map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex items-center gap-2">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-semibold
                  ${currentStep === step.id 
                    ? 'bg-blue-600 text-white' 
                    : index < ['step1', 'step2', 'step3', 'step4'].indexOf(currentStep)
                      ? 'bg-green-600 text-white'
                      : 'bg-slate-300 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                  }
                `}>
                  {index < ['step1', 'step2', 'step3', 'step4'].indexOf(currentStep) ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    index + 1
                  )}
                </div>
                <span className={`text-sm font-medium ${
                  currentStep === step.id ? 'text-blue-600' : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {step.label}
                </span>
              </div>
              {index < 3 && <ChevronRight className="w-5 h-5 text-slate-400 mx-2" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 左侧：输入区 */}
          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50 mb-4">
              {currentStep === 'step1' && '第1步：标题与大纲生成'}
              {currentStep === 'step2' && '第2步：世界与人物设定'}
              {currentStep === 'step3' && '第3步：分章细纲生成'}
              {currentStep === 'step4' && '第4步：章节正文创作'}
            </h2>

            {/* 步骤1输入 */}
            {currentStep === 'step1' && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="theme">小说主题 *</Label>
                  <Textarea
                    id="theme"
                    placeholder="例如：一艘探索宇宙的飞船，在星际航行中发现了神秘的古代文明遗迹，船员们必须解开谜团..."
                    value={data.step1.theme}
                    onChange={(e) => setData(prev => ({ ...prev, step1: { ...prev.step1, theme: e.target.value } }))}
                    disabled={isGenerating}
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="style">小说风格 *</Label>
                  <Input
                    id="style"
                    placeholder="例如：科幻、玄幻、武侠、言情、悬疑"
                    value={data.step1.style}
                    onChange={(e) => setData(prev => ({ ...prev, step1: { ...prev.step1, style: e.target.value } }))}
                    disabled={isGenerating}
                  />
                </div>
              </>
            )}

            {/* 步骤2输入（展示已生成内容） */}
            {currentStep === 'step2' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>已生成的标题</Label>
                  <Input value={data.step2.title} disabled className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>已生成的大纲</Label>
                  <Textarea value={data.step2.outline} disabled rows={3} className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="worldAndCharactersRequirements">世界/人物设定特殊要求（可选）</Label>
                  <Textarea
                    id="worldAndCharactersRequirements"
                    placeholder="例如：世界需要有独特的魔法体系，主要角色需要有一个隐藏身份，反派角色要有复杂的背景故事..."
                    value={data.step2.worldAndCharactersRequirements}
                    onChange={(e) => setData(prev => ({ ...prev, step2: { ...prev.step2, worldAndCharactersRequirements: e.target.value } }))}
                    disabled={isGenerating}
                    rows={4}
                  />
                </div>
              </div>
            )}

            {/* 步骤3输入（展示已生成内容） */}
            {currentStep === 'step3' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>小说标题</Label>
                  <Input value={data.step2.title} disabled className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>世界与人物设定</Label>
                  <Textarea value={data.step2.result} disabled rows={3} className="bg-slate-50" />
                </div>
                <div className="p-4 border rounded-lg bg-slate-50 dark:bg-slate-800">
                  <Label className="text-base font-semibold mb-3 block">章节结构设置（可选）</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="volumes">卷数</Label>
                      <Input
                        id="volumes"
                        type="number"
                        placeholder="例如：3"
                        min="1"
                        value={data.step3.volumes}
                        onChange={(e) => setData(prev => ({ ...prev, step3: { ...prev.step3, volumes: e.target.value } }))}
                        disabled={isGenerating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="chaptersPerVolume">每卷章节数</Label>
                      <Input
                        id="chaptersPerVolume"
                        type="number"
                        placeholder="例如：10"
                        min="1"
                        value={data.step3.chaptersPerVolume}
                        onChange={(e) => setData(prev => ({ ...prev, step3: { ...prev.step3, chaptersPerVolume: e.target.value } }))}
                        disabled={isGenerating}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="totalChapters">总章节数</Label>
                      <Input
                        id="totalChapters"
                        type="number"
                        placeholder="例如：30"
                        min="1"
                        value={data.step3.totalChapters}
                        onChange={(e) => setData(prev => ({ ...prev, step3: { ...prev.step3, totalChapters: e.target.value } }))}
                        disabled={isGenerating}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    填写卷数和每卷章节数，系统会自动计算总章节数；也可直接指定总章节数
                  </p>
                </div>
              </div>
            )}

            {/* 步骤4输入（选择章节） */}
            {currentStep === 'step4' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>分章细纲</Label>
                  <Textarea value={data.step3.result} disabled rows={6} className="bg-slate-50" />
                </div>
                <div className="space-y-2">
                  <Label>选择要创作的章节 *</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {chapters.map((chapter) => (
                      <Button
                        key={chapter.number}
                        variant={data.step4.selectedChapter === chapter.number ? 'default' : 'outline'}
                        onClick={() => setData(prev => ({ ...prev, step4: { ...prev.step4, selectedChapter: chapter.number } }))}
                        disabled={isGenerating}
                        className="text-left"
                      >
                        <div>
                          <div className="font-semibold">第{chapter.number}章</div>
                          <div className="text-xs opacity-70">{chapter.title}</div>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 按钮区 */}
            <div className="flex gap-3 pt-4">
              {!isGenerating ? (
                <>
                  <Button
                    onClick={currentStep === 'step1' ? handleStep1Generate :
                            currentStep === 'step2' ? handleStep2Generate :
                            currentStep === 'step3' ? handleStep3Generate :
                            handleStep4Generate}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <BookOpen className="w-4 h-4 mr-2" />
                    {currentStep === 'step4' ? '创作章节' : '生成'}
                  </Button>
                  {currentStep !== 'step1' && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (currentStep === 'step2') setCurrentStep('step1');
                        else if (currentStep === 'step3') setCurrentStep('step2');
                        else if (currentStep === 'step4') setCurrentStep('step3');
                      }}
                    >
                      返回上一步
                    </Button>
                  )}
                  {(data.step1.result && currentStep === 'step1') ||
                   (data.step2.result && currentStep === 'step2') ||
                   (data.step3.result && currentStep === 'step3') ? (
                    <Button
                      onClick={currentStep === 'step1' ? handleStep1Next :
                              currentStep === 'step2' ? handleStep2Next :
                              handleStep3Next}
                    >
                      下一步
                      <ChevronRight className="w-4 h-4 ml-2" />
                    </Button>
                  ) : null}
                </>
              ) : (
                <Button
                  onClick={handleStop}
                  variant="destructive"
                  className="flex-1"
                >
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  停止生成
                </Button>
              )}
            </div>
          </Card>

          {/* 右侧：输出区 */}
          <Card className="p-6 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">
                生成结果
              </h2>
              <div className="flex gap-2">
                {(data.step1.result || data.step2.result || data.step3.result || data.step4.result) && (
                  <Button onClick={handleDownload} variant="ghost" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    下载
                  </Button>
                )}
                {(data.step1.result || data.step2.result || data.step3.result || data.step4.result) && !isGenerating && (
                  <Button
                    onClick={() => {
                      if (currentStep === 'step1') handleStep1Generate();
                      else if (currentStep === 'step2') handleStep2Generate();
                      else if (currentStep === 'step3') handleStep3Generate();
                      else handleStep4Generate();
                    }}
                    variant="ghost"
                    size="sm"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    重新生成
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 bg-slate-50 dark:bg-slate-900 rounded-lg p-4 min-h-[500px] max-h-[700px] overflow-y-auto">
              {data.step1.result || data.step2.result || data.step3.result || data.step4.result ? (
                <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap">
                  {currentStep === 'step1' && data.step1.result}
                  {currentStep === 'step2' && data.step2.result}
                  {currentStep === 'step3' && data.step3.result}
                  {currentStep === 'step4' && data.step4.result}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-600">
                  {isGenerating ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>正在生成中...</span>
                    </div>
                  ) : (
                    <p>填写左侧设定后，点击生成按钮</p>
                  )}
                </div>
              )}
            </div>

            {(data.step1.result || data.step2.result || data.step3.result || data.step4.result) && (
              <div className="mt-4 flex gap-4 text-sm text-slate-600 dark:text-slate-400">
                <div>
                  当前生成字数: {(data.step1.result || data.step2.result || data.step3.result || data.step4.result).length}
                </div>
                {currentStep === 'step4' && data.step4.selectedChapter && (
                  <Badge variant="outline">正在创作：第{data.step4.selectedChapter}章</Badge>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
