import { useState } from "react";

import {
  loadPoultry,
  loadLivestock,
  loadProduction,
  loadFeeding,
  loadExpenses,
} from "../services/storage";

import {
  chatWithFarmAI,
  type ChatMessage,
  type FarmAIData,
} from "../services/aiService";

async function getFarmData(): Promise<FarmAIData> {
  const [
    poultry,
    livestock,
    production,
    feeding,
    expenses,
  ] = await Promise.all([
    loadPoultry(),
    loadLivestock(),
    loadProduction(),
    loadFeeding(),
    loadExpenses(),
  ]);

  return {
    poultry,
    livestock,
    production,
    feeding,
    expenses,
  };
}

function FarmChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage() {
    const trimmedQuestion = question.trim();

    if (!trimmedQuestion || loading) {
      return;
    }

    setError("");

    const userMessage: ChatMessage = {
      role: "user",
      text: trimmedQuestion,
    };

    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setQuestion("");
    setLoading(true);

    try {
      const farmData = await getFarmData();

      const answer = await chatWithFarmAI(
        trimmedQuestion,
        farmData,
        messages
      );

      const assistantMessage: ChatMessage = {
        role: "assistant",
        text: answer,
      };

      setMessages([
        ...updatedMessages,
        assistantMessage,
      ]);
    } catch (error) {
      console.error("Farm AI chat error:", error);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to contact the AI assistant."
      );
    } finally {
      setLoading(false);
    }
  }

  function askSuggestedQuestion(text: string) {
    setQuestion(text);
  }

  function handleKeyDown(
    event: React.KeyboardEvent<HTMLInputElement>
  ) {
    if (event.key === "Enter") {
      sendMessage();
    }
  }

  function clearChat() {
    setMessages([]);
    setError("");
    setQuestion("");
  }

  return (
    <section className="farm-chatbot">
      {/* Header */}
      <div className="farm-chat-header">
        <div className="farm-chat-title">
          <div className="farm-chat-avatar">
            <img src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=80&q=70" alt="AI" className="chat-avatar-img" />
          </div>

          <div>
            <span className="farm-chat-eyebrow">
              KAGOCHI FARM AI
            </span>

            <h2>Farm AI Assistant</h2>

            <p>
              Ask questions and get insights from your farm records.
            </p>
          </div>
        </div>

        <div className="farm-chat-online">
          <span></span>
          AI Online
        </div>
      </div>

      {/* Chat area */}
      <div className="farm-chat-body">

        {/* Empty state */}
        {messages.length === 0 && (
          <div className="farm-chat-welcome">

            <div className="farm-chat-welcome-icon">
              <img src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=80&q=70" alt="AI" className="chat-welcome-img" />
            </div>

            <h3>
              Hello, Farmer! 👋
            </h3>

            <p>
              I can help you understand your poultry,
              livestock, feeding, production and expense
              records.
            </p>

            <div className="farm-chat-suggestions">

              <button type="button" onClick={() => askSuggestedQuestion("How are my poultry performing?")}>
                <img src="https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?w=80&q=70" alt="Poultry" className="suggestion-img" />
                <div><strong>Poultry Performance</strong><small>Analyse my poultry records</small></div>
              </button>

              <button type="button" onClick={() => askSuggestedQuestion("Which part of my farm needs more attention?")}>
                <img src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=80&q=70" alt="Analytics" className="suggestion-img" />
                <div><strong>Farm Attention</strong><small>Find areas that need attention</small></div>
              </button>

              <button type="button" onClick={() => askSuggestedQuestion("How can I monitor my farm expenses?")}>
                <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=80&q=70" alt="Expenses" className="suggestion-img" />
                <div><strong>Farm Expenses</strong><small>Understand my farm costs</small></div>
              </button>

              <button type="button" onClick={() => askSuggestedQuestion("How can I improve my farm production?")}>
                <img src="https://images.unsplash.com/photo-1506976785307-8732e854ad03?w=80&q=70" alt="Production" className="suggestion-img" />
                <div><strong>Production</strong><small>Improve farm production</small></div>
              </button>

            </div>
          </div>
        )}

        {/* Messages */}
        {messages.length > 0 && (
          <div className="farm-chat-messages">

            {messages.map((message, index) => (
              <div
                key={index}
                className={`farm-chat-message ${
                  message.role === "user"
                    ? "user-message"
                    : "assistant-message"
                }`}
              >

                <div className="farm-message-avatar">
                  <img
                    src={message.role === "user"
                      ? "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=80&q=70"
                      : "https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=80&q=70"}
                    alt={message.role === "user" ? "You" : "AI"}
                    className="chat-msg-avatar-img"
                  />
                </div>

                <div className="farm-message-content">

                  <span className="farm-message-name">
                    {message.role === "user"
                      ? "You"
                      : "Kagochi Farm AI"}
                  </span>

                  <div className="farm-message-bubble">
                    {message.text
                      .split("\n")
                      .map((line, lineIndex) => (
                        <p key={lineIndex}>
                          {line || "\u00A0"}
                        </p>
                      ))}
                  </div>

                </div>
              </div>
            ))}

            {/* AI thinking */}
            {loading && (
              <div className="farm-chat-message assistant-message">

                <div className="farm-message-avatar">
                  <img src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=80&q=70" alt="AI" className="chat-msg-avatar-img" />
                </div>

                <div className="farm-message-content">

                  <span className="farm-message-name">
                    Kagochi Farm AI
                  </span>

                  <div className="farm-message-bubble thinking-bubble">
                    <div className="farm-thinking">
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>

                    <small>
                      Analysing your farm...
                    </small>
                  </div>

                </div>
              </div>
            )}

          </div>
        )}

        {/* Error */}
        {error && (
          <div className="farm-chat-error">
            <span>⚠️</span>

            <div>
              <strong>AI connection problem</strong>
              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
            >
              ×
            </button>
          </div>
        )}

      </div>

      {/* Input area */}
      <div className="farm-chat-footer">

        {messages.length > 0 && (
          <button
            type="button"
            className="farm-clear-chat"
            onClick={clearChat}
          >
            🗑 Clear chat
          </button>
        )}

        <div className="farm-chat-input-wrapper">

          <span className="farm-input-icon">
            <img src="https://images.unsplash.com/photo-1677442135703-1787eea5ce01?w=80&q=70" alt="AI" className="input-icon-img" />
          </span>

          <input
            type="text"
            value={question}
            onChange={(event) =>
              setQuestion(event.target.value)
            }
            onKeyDown={handleKeyDown}
            placeholder="Ask your farm assistant..."
            disabled={loading}
          />

          <button
            type="button"
            className="farm-send-button"
            onClick={sendMessage}
            disabled={
              loading || !question.trim()
            }
            aria-label="Send message"
          >
            {loading ? "..." : "➤"}
          </button>

        </div>

        <small className="farm-chat-hint">
          Press <strong>Enter</strong> to send
        </small>

      </div>
    </section>
  );
}

export default FarmChatbot;