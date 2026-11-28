import { useEffect, useState } from "react";
import {
  chatWithFarmAI,
  pingApiHealth,
  AIRequestError,
  type ChatMessage,
} from "../services/aiService";
import {
  BrainCircuit,
  Send,
  CalendarDays,
  AlertCircle,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { getNairobiDateString, addDaysToDateStr } from "../utils/datePeriod";

type ChatPeriod = "today" | "yesterday" | "7d" | "30d" | "month";

export default function FarmChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [period, setPeriod] = useState<ChatPeriod>("today");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [failedQuestion, setFailedQuestion] = useState("");

  useEffect(() => {
    void pingApiHealth();
  }, []);

  const todayStr = getNairobiDateString();

  function getPeriodOptions(p: ChatPeriod) {
    if (p === "today") return { periodDays: 1, to: todayStr, from: todayStr };
    if (p === "yesterday") {
      const y = addDaysToDateStr(todayStr, -1);
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
    setErrorCode("");
    setFailedQuestion("");
    const userMsg: ChatMessage = { role: "user", text: q };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setQuestion("");
    setLoading(true);

    try {
      const opts = getPeriodOptions(period);
      const response = await chatWithFarmAI(q, undefined, messages, opts);
      setMessages([...updated, { role: "assistant", text: response.answer }]);
      if (response.warningCode) {
        setFailedQuestion(q);
        setErrorCode(response.warningCode);
        setError("The provider returned a database-only answer.");
      } else {
        setFailedQuestion("");
      }
    } catch (err) {
      console.error(err);
      setFailedQuestion(q);
      setErrorCode(err instanceof AIRequestError ? err.code : "unavailable");
      setError(err instanceof Error ? err.message : "Failed to get AI response.");
    } finally {
      setLoading(false);
    }
  }

  async function retryLastQuestion() {
    const q = failedQuestion;
    if (!q || loading) return;
    setLoading(true);
    setError("");
    setErrorCode("");
    try {
      const response = await chatWithFarmAI(q, undefined, messages.slice(0, -1), getPeriodOptions(period));
      setMessages((current) => [...current, { role: "assistant", text: response.answer }]);
      if (response.warningCode) {
        setErrorCode(response.warningCode);
        setError("The provider returned a database-only answer.");
      } else {
        setFailedQuestion("");
      }
    } catch (err) {
      console.error(err);
      setErrorCode(err instanceof AIRequestError ? err.code : "unavailable");
      setError(err instanceof Error ? err.message : "Failed to get AI response.");
    } finally {
      setLoading(false);
    }
  }

  const friendlyError = errorCode === "timeout"
    ? "The farm assistant took too long to respond. Please try again."
    : errorCode === "rate_limit" || errorCode === "quota"
      ? "The assistant is busy or has reached its current quota. Please try again shortly."
      : errorCode === "configuration"
        ? "The farm assistant is not configured yet. Please contact your administrator."
        : errorCode === "data_unavailable"
          ? "Your farm records could not be loaded. Please try again."
          : error || "The farm assistant is temporarily unavailable. Please try again.";

  return (
    <div className="kf-panel farm-chatbot-container">
      {/* Chat header */}
      <div className="chat-header-bar">
        <div className="chat-header-left">
          <div className="chat-avatar">
            <BrainCircuit size={20} color="var(--kf-action)" />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 16 }}>Farm Assistant Chat</h4>
            <span style={{ fontSize: 12, color: "var(--kf-muted)" }}>
              Grounded in real recorded farm data only. Never fabricates figures.
            </span>
          </div>
        </div>

        {/* Period Selector Chips */}
        <div className="chat-period-chips">
          <span style={{ fontSize: 12, color: "var(--kf-muted)", display: "flex", alignItems: "center", gap: 4 }}>
            <CalendarDays size={13} strokeWidth={1.5} /> Analyzing:
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
          Did my farm make a profit?
        </button>
        <button
          type="button"
          className="suggested-chip"
          onClick={() => handleSend("Which expenses were unusually high?")}
        >
          Which expenses were highest?
        </button>
        <button
          type="button"
          className="suggested-chip"
          onClick={() => handleSend("Which vaccinations are due today or overdue?")}
        >
          Are any vaccinations due?
        </button>
        <button
          type="button"
          className="suggested-chip"
          onClick={() => handleSend("How is egg and milk production doing?")}
        >
          Egg &amp; Milk production trends?
        </button>
        <button
          type="button"
          className="suggested-chip"
          onClick={() => handleSend("What are the key things I should check tomorrow?")}
        >
          What should I check tomorrow?
        </button>
      </div>

      {/* Chat Messages */}
      <div className="chat-messages-scroll">
        {messages.length === 0 ? (
          <div className="chat-empty-state">
            <BrainCircuit size={40} strokeWidth={1.5} color="var(--kf-muted-2)" />
            <p><strong>Ask your Farm Assistant anything about your farm records.</strong></p>
            <p style={{ fontSize: 13, color: "var(--kf-muted)" }}>
              Select a question above or type your own question below.
            </p>
          </div>
        ) : (
          messages.map((m, idx) => (
            <div key={idx} className={`chat-message ${m.role === "user" ? "user-msg" : "bot-msg"}`}>
              <div className="msg-avatar">
                {m.role === "user" ? (
                  <UserRound size={16} strokeWidth={1.5} />
                ) : (
                  <BrainCircuit size={16} strokeWidth={1.5} color="var(--kf-action)" />
                )}
              </div>
              <div className="msg-bubble">
                <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{m.text}</p>
              </div>
            </div>
          ))
        )}

        {loading && (
          <div className="chat-message bot-msg">
            <div className="msg-avatar">
              <BrainCircuit size={16} strokeWidth={1.5} color="var(--kf-action)" />
            </div>
            <div className="msg-bubble loading-bubble">
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span className="typing-dot" />
              <span style={{ fontSize: 12, marginLeft: 8, color: "var(--kf-muted)" }}>Analyzing records...</span>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="kf-alert kf-alert--error farm-chat-error" role="alert" style={{ margin: "8px 16px" }}>
          <AlertCircle size={15} />
          <span>{friendlyError}</span>
          <button type="button" onClick={retryLastQuestion} disabled={loading || !failedQuestion}>Try again</button>
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
          <Send size={18} strokeWidth={1.5} />
        </button>
        {messages.length > 0 && (
          <button
            type="button"
            className="btn-chat-clear"
            onClick={() => setMessages([])}
            title="Reset conversation"
          >
            <RefreshCw size={16} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}
