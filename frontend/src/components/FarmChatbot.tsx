import { useState } from "react";
import {
  chatWithFarmAI,
  type ChatMessage,
} from "../services/aiService";
import {
  Sparkles,
  Send,
  Calendar,
  AlertCircle,
  RotateCcw,
  Bot,
  User,
} from "lucide-react";

type ChatPeriod = "today" | "yesterday" | "7d" | "30d" | "month";

export default function FarmChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [period, setPeriod] = useState<ChatPeriod>("today");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);

  function getPeriodOptions(p: ChatPeriod) {
    if (p === "today") return { periodDays: 1, to: todayStr, from: todayStr };
    if (p === "yesterday") {
      const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      return { periodDays: 1, to: y, from: y };
    }
    if (p === "7d") return { periodDays: 7, to: todayStr };
    if (p === "30d") return { periodDays: 30, to: todayStr };
    if (p === "month") {
      const startOfMonth = `${todayStr.slice(0, 7)}-01`;
      return { to: todayStr, from: startOfMonth };
    }
    return { periodDays: 1, to: todayStr };
  }

  async function handleSend(customText?: string) {
    const q = (customText || question).trim();
    if (!q || loading) return;

    setError("");
    const userMsg: ChatMessage = { role: "user", text: q };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setQuestion("");
    setLoading(true);

    try {
      const opts = getPeriodOptions(period);
      const answer = await chatWithFarmAI(q, undefined, messages, opts);
      setMessages([...updated, { role: "assistant", text: answer }]);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to get AI response.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card-box farm-chatbot-container">
      {/* Chat header */}
      <div className="chat-header-bar">
        <div className="chat-header-left">
          <div className="chat-avatar">
            <Sparkles size={20} color="#16a34a" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 16 }}>Farm Assistant Chat</h4>
            <span style={{ fontSize: 12, color: "#64748b" }}>
              Grounded in real recorded farm data only. Never fabricates figures.
            </span>
          </div>
        </div>

        {/* Period Selector Chips */}
        <div className="chat-period-chips">
          <span style={{ fontSize: 12, color: "#64748b", display: "flex", alignItems: "center", gap: 4 }}>
            <Calendar size={13} /> Analyzing:
          </span>
          <button
            type="button"
            className={`period-btn ${period === "today" ? "active" : ""}`}
            onClick={() => setPeriod("today")}
          >
            Today
          </button>
          <button
            type="button"
            className={`period-btn ${period === "yesterday" ? "active" : ""}`}
            onClick={() => setPeriod("yesterday")}
          >
            Yesterday
          </button>
          <button
            type="button"
            className={`period-btn ${period === "7d" ? "active" : ""}`}
            onClick={() => setPeriod("7d")}
          >
            Last 7d
          </button>
          <button
            type="button"
            className={`period-btn ${period === "month" ? "active" : ""}`}
            onClick={() => setPeriod("month")}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Suggested Questions */}
      <div className="suggested-questions-row">
        <span className="suggested-label">Common questions:</span>
        <button
          type="button"
          className="suggested-chip"
          onClick={() => handleSend("Did my farm make a profit today?")}
        >
          💰 Did my farm make a profit?
        </button>
        <button
          type="button"
          className="suggested-chip"
          onClick={() => handleSend("Which expenses were unusually high?")}
        >
          💸 Which expenses were highest?
        </button>
        <button
          type="button"
          className="suggested-chip"
          onClick={() => handleSend("Which vaccinations are due today or overdue?")}
        >
          💉 Are any vaccinations due?
        </button>
        <button
          type="button"
          className="suggested-chip"
          onClick={() => handleSend("How is egg and milk production doing?")}
        >
          🥚 Egg & Milk production trends?
        </button>
        <button
          type="button"
          className="suggested-chip"
          onClick={() => handleSend("What are the key things I should check tomorrow?")}
        >
          📋 What should I check tomorrow?
        </button>
      </div>

      {/* Chat Messages */}
      <div className="chat-messages-scroll">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <Bot size={40} color="#94a3b8" />
            <p><strong>Ask your Farm Assistant anything about your farm records.</strong></p>
            <p style={{ fontSize: 13, color: "#64748b" }}>
              Select a question above or type your own question below.
            </p>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div key={idx} className={`chat-message ${m.role === "user" ? "user-msg" : "bot-msg"}`}>
              <div className="msg-avatar">
                {m.role === "user" ? <User size={16} /> : <Bot size={16} />}
              </div>
              <div className="msg-bubble">
                <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{m.text}</p>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="chat-message bot-msg">
            <div className="msg-avatar"><Bot size={16} /></div>
            <div className="msg-bubble loading-bubble">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span style={{ fontSize: 12, marginLeft: 8, color: "#64748b" }}>Analyzing records...</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="daily-alert error-alert" style={{ margin: "8px 16px" }}>
          <AlertCircle size={15} /> <span>{error}</span>
        </div>
      )}

      {/* Chat Input Bar */}
      <div className="chat-input-row">
        <input
          type="text"
          className="chat-text-input"
          placeholder="Ask a question about your farm (e.g. How much did I spend on feed?)..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          disabled={loading}
        />
        <button
          type="button"
          className="btn-chat-send"
          onClick={() => handleSend()}
          disabled={loading || !question.trim()}
          aria-label="Send"
        >
          <Send size={18} />
        </button>
        {messages.length > 0 && (
          <button
            type="button"
            className="btn-chat-clear"
            onClick={() => setMessages([])}
            title="Reset conversation"
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
