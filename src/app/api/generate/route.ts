import { NextRequest } from 'next/server';
import { LLMClient, Config } from 'coze-coding-dev-sdk';

interface GenerateRequest {
  mode: 'titleAndOutline' | 'worldAndCharacters' | 'chapterOutline' | 'chapterContent';
  theme?: string;
  style?: string;
  title?: string;
  outline?: string;
  worldAndCharacters?: string;
  chapterOutline?: string;
  chapterNumber?: string;
  previousContent?: string;
  // 新增参数
  worldAndCharactersRequirements?: string;
  volumes?: string;
  chaptersPerVolume?: string;
  totalChapters?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GenerateRequest = await request.json();
    const { 
      mode, 
      theme, 
      style, 
      title, 
      outline, 
      worldAndCharacters, 
      chapterOutline, 
      chapterNumber, 
      previousContent,
      worldAndCharactersRequirements,
      volumes,
      chaptersPerVolume,
      totalChapters
    } = body;

    const config = new Config();
    const client = new LLMClient(config);

    let systemPrompt = '';
    let userPrompt = '';

    // 根据不同的生成模式构建不同的提示词
    switch (mode) {
      case 'titleAndOutline':
        if (!theme || !style) {
          return new Response(
            JSON.stringify({ error: '主题和风格是必填项' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        systemPrompt = `你是一位专业的小说策划专家，擅长为${style}风格的小说设计标题和大纲。
请根据用户的主题创作：
1. 一个吸引人的小说标题
2. 一份完整的小说大纲（包含故事梗概、主要冲突、故事走向等）
3. 要求：标题简洁有力，大纲逻辑清晰，字数不少于500字

请按以下格式输出：
# 小说标题
[标题]

# 小说大纲
[大纲内容]`;

        userPrompt = `小说主题：${theme}\n小说风格：${style}\n\n请根据以上信息生成小说标题和大纲。`;
        break;

      case 'worldAndCharacters':
        if (!title || !theme || !style) {
          return new Response(
            JSON.stringify({ error: '标题、主题和风格是必填项' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        systemPrompt = `你是一位专业的小说世界构建师，擅长创作${style}风格的小说世界和人物设定。
请根据小说信息创作：
1. 世界设定（世界观、地理环境、社会结构、力量体系等）
2. 主要人物设定（包含3-5个主要角色，每个角色需有：姓名、性格、外貌、背景、目标等）
3. 如果用户提供了特殊要求，必须严格遵守这些要求

请按以下格式输出：
# 世界设定
[世界设定内容]

# 人物设定
[人物设定内容]`;

        userPrompt = `小说标题：${title}\n小说主题：${theme}\n小说风格：${style}\n小说大纲：${outline}`;
        if (worldAndCharactersRequirements && worldAndCharactersRequirements.trim()) {
          userPrompt += `\n\n用户特殊要求：\n${worldAndCharactersRequirements}`;
        }
        userPrompt += `\n\n请根据以上信息生成世界设定和人物设定。`;
        break;

      case 'chapterOutline':
        if (!title || !outline) {
          return new Response(
            JSON.stringify({ error: '标题和大纲是必填项' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        systemPrompt = `你是一位专业的小说结构规划师，擅长设计${style}风格小说的章节安排。
请根据小说大纲创作详细的分章细纲：
1. 根据用户要求的卷数和章节数进行设计
2. 如果没有指定，默认设计10-15个章节
3. 每章需包含：章节标题、主要情节、关键冲突、章节作用等
4. 要求：章节之间逻辑连贯，情节递进合理，每章细纲不少于100字
5. 如果是分卷设计，需要标注卷数，如"第一卷 第1章"

请按以下格式输出：
# 分章细纲

第1章：[章节标题]
[本章细纲内容]

第2章：[章节标题]
[本章细纲内容]

...（以此类推）`;

        userPrompt = `小说标题：${title}\n小说大纲：${outline}\n世界设定：${worldAndCharacters}`;
        if (volumes || chaptersPerVolume || totalChapters) {
          userPrompt += `\n\n章节结构要求：`;
          if (volumes) userPrompt += `\n- 卷数：${volumes}卷`;
          if (chaptersPerVolume) userPrompt += `\n- 每卷章节数：${chaptersPerVolume}章`;
          if (totalChapters) userPrompt += `\n- 总章节数：${totalChapters}章`;
        }
        userPrompt += `\n\n请根据以上信息生成分章细纲。`;
        break;

      case 'chapterContent':
        if (!title || !chapterNumber || !chapterOutline) {
          return new Response(
            JSON.stringify({ error: '标题、章节号和章节细纲是必填项' }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }

        systemPrompt = `你是一位专业的小说作家，擅长创作${style}风格的小说。
请根据分章细纲创作章节正文，要求：
1. 文字生动形象，人物性格鲜明
2. 情节引人入胜，结构清晰
3. 语言流畅，符合${style}风格
4. 保持故事连贯性和逻辑性
5. 章节内容不少于800字

直接开始输出小说正文，不需要重复章节标题或任何开场白。`;

        // 提取对应章节的细纲
        const chapterRegex = new RegExp(`第${chapterNumber}章[：:][^\\n]*\\n([^]*?)(?=第\\d+章|$)`, 's');
        const chapterMatch = chapterOutline.match(chapterRegex);
        const currentChapterOutline = chapterMatch ? chapterMatch[1].trim() : chapterOutline;

        userPrompt = `小说标题：${title}\n当前章节：第${chapterNumber}章\n章节细纲：${currentChapterOutline}\n世界设定：${worldAndCharacters}\n人物设定：${worldAndCharacters}\n\n请根据以上信息创作本章正文。`;
        break;

      default:
        return new Response(
          JSON.stringify({ error: '无效的生成模式' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
    }

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    // 创建流式响应
    const encoder = new TextEncoder();
    const stream = client.stream(messages, { temperature: 0.8 });

    // 创建 ReadableStream 用于 SSE
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.content) {
              const text = chunk.content.toString();
              // 发送 SSE 格式的数据
              const data = `data: ${JSON.stringify({ content: text })}\n\n`;
              controller.enqueue(encoder.encode(data));
            }
          }
          // 发送结束标记
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          const errorData = `data: ${JSON.stringify({ error: '生成失败' })}\n\n`;
          controller.enqueue(encoder.encode(errorData));
          controller.close();
        }
      }
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Transfer-Encoding': 'chunked'
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return new Response(
      JSON.stringify({ error: '服务器错误' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
