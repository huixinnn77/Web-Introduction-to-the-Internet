import { GoogleGenAI } from '@google/genai';
import React, { useEffect, useMemo, useRef, useState } from "react";

// Gemini Chat types
export type Part = { text: string };
export type ChatMsg = { role: "user" | "model"; parts: Part[] };

type Props = {
  defaultModel?: string;
  starter?: string;
};

export default function AItest({
  defaultModel = "gemini-2.5-flash",
  starter = "嗨！幫我安排一下台北咖啡廳探店名單，以及分析他們的優缺點～",
}: Props) {
  const [model, setModel] = useState<string>(defaultModel);
  const [history, setHistory] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [displayedText, setDisplayedText] = useState("");
  const [rememberKey, setRememberKey] = useState(true);
  const [theme, setTheme] = useState("default");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef<HTMLDivElement | null>(null);

  const ai = useMemo(() => {
        try {
          return apiKey ? new GoogleGenAI({ apiKey }) : null;
        } catch {
          return null;
        }
      }, [apiKey]);
      const roles = [
      { id: "coffee", name: "☕ 咖啡達人", prompt: "你是一位台北咖啡達人，熟悉各家風格與氣氛，回答時請用專業但溫和的語氣。" },
      { id: "mentor", name: "💼 面試顧問", prompt: "你是一位面試顧問，擅長給出具體建議，並教導我如何變得更好。" },
      { id: "coach", name: "🧘‍♀️ 人生教練", prompt: "你是溫暖的教練，回答時要適當給予情緒鼓勵與支持。" },
    ];
    const [role, setRole] = useState(roles[0]);
  
  // Load API key from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("gemini_api_key");
    if (saved) setApiKey(saved);
  }, []);
  // Warm welcome + starter
  useEffect(() => {
    setHistory([
      { role: "model", parts: [{ text: "👋 這裡是 Gemini 小幫手，有什麼想聊的？" }] },
    ]);
    if (starter) setInput(starter);
  }, [starter]);

  // Auto scroll
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [history, loading]);

  useEffect(() => {
      if (loading) return;
      const last = history[history.length - 1];
      if (last?.role === "model") {
        let i = 0;
        const text = last.parts[0].text;
        const interval = setInterval(() => {
          setDisplayedText(text.slice(0, i));
          i++;
          if (i > text.length) clearInterval(interval);
        }, 20);
        return () => clearInterval(interval);
      }
    }, [history, loading]);

    useEffect(() => {
      const themes: Record<string, any> = {
        default: { bg: "#f0f4ff", card: "#fff", text: "#111827" },
        dark: { bg: "#111827", card: "#1f2937", text: "#94b4d5ff" },
        green: { bg: "#cbffdaff", card: "#96fca7ff", text: "#14532d" },
        pink: { bg: "#ffbdd8ff", card: "#febbbbff", text: "#831843" },
      };
      const t = themes[theme];
      document.body.style.background = t.bg;
      document.documentElement.style.setProperty("--card-bg", t.card);
      document.documentElement.style.setProperty("--text-color", t.text);
    }, [theme]);

  
  async function sendMessage(message?: string) {
    const content = `${role.prompt}\n\n${(message ?? input).trim()}`;
    if (!content || loading) return;
    if (!ai) {
      setError("請先輸入有效的 Gemini API Key");
      return;
    }

    setError("");
    setLoading(true);
    const newHistory: ChatMsg[] = [...history, { role: "user", parts: [{ text: content }] }];
    setHistory(newHistory);
    setInput("");

    try {
      const resp = await ai.models.generateContent({ model, contents: newHistory, // send the chat history to keep context
      });
      const reply = resp.text || '[No content]';
      setHistory((h) => [...h, { role: "model", parts: [{ text: reply }] }]);
    } catch (err: any) {
      setError(err?.message || String(err));
    } finally {
      setLoading(false);
    }
  }

  function renderMarkdownLike(text: string) {
  // 將多個空行變成段落
    const paragraphs = text.split(/\n\s*\n/);
    return (
      <>
        {paragraphs.map((para, i) => (
          <p key={i} style={{ margin: '8px 0', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
            {para}
          </p>
        ))}
      </>
    );
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.header}>
          <div>Gemini Chat（直連 SDK，不經 proxy）</div>
          <div style={{ position: "absolute", right: 20, top: 10 }}>
            <select
              value={theme}
              onChange={e => setTheme(e.target.value)}
              style={{ borderRadius: 8, padding: "4px 8px" }} 
             >
              <option value="default">🌤️ Default</option>
              <option value="dark">🌙 Dark</option>
              <option value="green">🌿 Green</option>
              <option value="pink">🌸 Pink</option>
             </select>
          </div>
        </div>

        {/* Controls */}
        <div style={styles.controls}>
          <label style={styles.label}>
            <span>Model</span>
            <input
              value={model}
              onChange={e => setModel(e.target.value)}
              placeholder="例如 gpt-3.5-turbo、gpt-4o-mini"
              style={styles.input}
            />
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              模型名稱會隨時間更新，若錯誤請改成官方清單中的有效 ID。
            </div>
          </label>

          <label style={styles.label}>
            <span>Gemini API Key</span>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => {
                const v = e.target.value; setApiKey(v);
                if (rememberKey) localStorage.setItem('gemini_api_key', v);
              }}
              placeholder="貼上你的 API Key（只在本機瀏覽器儲存）"
              style={styles.input}
            />
            <label style={{ display:'flex', alignItems:'center', gap:8, marginTop:6, fontSize:12 }}>
              <input type="checkbox" checked={rememberKey} onChange={(e)=>{
                setRememberKey(e.target.checked);
                if (!e.target.checked) localStorage.removeItem('gemini_api_key');
                else if (apiKey) localStorage.setItem('gemini_api_key', apiKey);
              }} />
              <span>記住在本機（localStorage）</span>
            </label>
            <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
              Demo 用法：在瀏覽器內保存 Key 僅供教學。正式環境請改走後端或使用安全限制的 Key。
            </div>
          </label>
          <label style={styles.label}>
            <span>角色設定</span>
            <select
              value={role.id}
              onChange={e => setRole(roles.find(r => r.id === e.target.value)!)}
              style={styles.input}
            >
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>

            {/* 💬 顯示角色說明 */}
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4, lineHeight: 1.5 }}>
              {role.prompt}
            </div>
          </label>
        </div>
        
        

        {/* Messages */}
        <div ref={listRef} style={styles.messages}>
          {history.map((m, idx) => (
            <div key={idx} style={{ ...styles.msg, ...(m.role === 'user' ? styles.user : styles.assistant) }}>
              <div style={styles.msgRole}>{m.role === 'user' ? 'You' : 'Gemini'}</div>
              <div style={styles.msgBody}>
                {m.role === 'model' && idx === history.length - 1 && !loading
                  ? renderMarkdownLike(displayedText)
                  : renderMarkdownLike(m.parts.map(p => p.text).join('\n'))}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ ...styles.msg, ...styles.assistant }}>
              <div style={styles.msgRole}>Gemini</div>
              <div style={styles.msgBody}>思考中…</div>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div style={styles.error}>⚠ {error}</div>
        )}

        {/* Composer */}
        <form
          onSubmit={e => { e.preventDefault(); sendMessage(); }}
          style={styles.composer}
        >
          <input
            placeholder="輸入訊息，按 Enter 送出"
            value={input}
            onChange={e => setInput(e.target.value)}
            style={styles.textInput}
          />
          <button type="submit" disabled={loading || !input.trim() || !apiKey} style={styles.sendBtn}>
            送出
          </button>
        </form>

        {/* Quick examples */}
        <div style={styles.suggestionContainer}>
          {['今天台北有什麼免費展覽？', '幫我把這段英文翻成中文：Hello from Taipei!', '寫一首關於捷運的短詩'].map((q) => (
            <button key={q} type="button" style={styles.suggestion} onClick={() => sendMessage(q)}>{q}</button>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
    wrap: {
      width: '100%',
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #f0f4ff 0%, #fefefe 100%)',
      boxSizing: 'border-box',
      padding: 0,
    },

    card: {
      background: 'var(--card-bg)',
      color: 'var(--text-color)',
      width: '95%',
      maxWidth: '1400px',
      height: '90vh', // ✅ 整張卡片固定高度
      border: '1px solid #e5e7eb',
      borderRadius: 20,
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    },

    header: {
      padding: '10px 12px',
      fontWeight: 700,
      borderBottom: '1px solid #e5e7eb',
      background: '#f9fafb',
      position: 'relative',
      flexShrink: 0, // ✅ 不被壓縮
    },

    controls: {
      display: 'grid',
      gap: 12,
      gridTemplateColumns: '1fr 1fr',
      padding: 12,
      flexShrink: 0, // ✅ 不被壓縮
      overflowY: 'auto',
    },

    label: { display: 'grid', gap: 6, fontSize: 13, fontWeight: 600 },
    input: { padding: '10px 12px', borderRadius: 10, border: '1px solid #e5e7eb', fontSize: 14 },

    // ✅ 訊息區：自動撐滿中間空間、可滾動
    messages: {
      flex: 1,
      padding: 16,
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      overflowY: 'auto',
      minHeight: 0, // ⚠️ 很關鍵：避免撐破 layout
    },

    msg: { borderRadius: 12, padding: 10, border: '1px solid #e5e7eb' },
    user: { background: '#eef2ff', borderColor: '#c7d2fe' },
    assistant: { background: '#f1f5f9', borderColor: '#e2e8f0' },
    msgRole: { fontSize: 12, fontWeight: 700, opacity: 0.7, marginBottom: 6 },

    msgBody: {
      fontSize: 15,
      lineHeight: 1.7,
      background: '#fff',
      padding: '10px 14px',
      borderRadius: 12,
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    },

    error: { color: '#b91c1c', padding: '4px 12px', flexShrink: 0 },

    // ✅ 輸入區固定在底部
    composer: {
      padding: 12,
      display: 'grid',
      gridTemplateColumns: '1fr auto',
      gap: 8,
      borderTop: '1px solid #e5e7eb',
      flexShrink: 0,
      background: '#fafafa',
    },

    // ✅ 推薦訊息保持可見、但不會擠壞 messages
    suggestionContainer: {
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      padding: '8px 12px 16px',
      borderTop: '1px solid #e5e7eb',
      flexShrink: 0,
      background: '#fff',
      justifyContent: 'flex-start',
    },

    textInput: {
      padding: '10px 12px',
      borderRadius: 10,
      border: '1px solid #e5e7eb',
      fontSize: 14,
    },

    sendBtn: {
      padding: '10px 14px',
      borderRadius: 999,
      border: '1px solid #111827',
      background: '#111827',
      color: '#fff',
      fontSize: 14,
      cursor: 'pointer',
    },

    suggestion: {
      padding: '6px 10px',
      borderRadius: 999,
      border: '1px solid #e5e7eb',
      background: '#f9fafb',
      cursor: 'pointer',
      fontSize: 12,
    },
  };
