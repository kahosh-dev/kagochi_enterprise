import { useState, useRef, useEffect, useId } from "react";
import { ChevronDown, Search, X } from "lucide-react";

export interface SearchableOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  group?: string;
}

interface SearchableSelectProps {
  id?: string;
  label: string;
  required?: boolean;
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  allowCustom?: boolean;
  customOptionLabel?: string;
  customValue?: string;
  onCustomChange?: (val: string) => void;
  customPlaceholder?: string;
  hint?: React.ReactNode;
  disabled?: boolean;
}

export function SearchableSelect({
  id,
  label,
  required,
  options,
  value,
  onChange,
  placeholder = "-- Select --",
  searchPlaceholder = "Type to search...",
  allowCustom = true,
  customOptionLabel = "Other / type manually",
  customValue = "",
  onCustomChange,
  customPlaceholder = "Enter custom name",
  hint,
  disabled,
}: SearchableSelectProps) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  const isCustomSelected = value === "__custom__";

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      opt.label.toLowerCase().includes(q) ||
      (opt.sublabel && opt.sublabel.toLowerCase().includes(q)) ||
      (opt.badge && opt.badge.toLowerCase().includes(q))
    );
  });

  return (
    <div className="kf-field" ref={containerRef}>
      <label htmlFor={selectId} className="kf-label">
        {label}
        {required && <span className="kf-required">*</span>}
      </label>

      <div style={{ position: "relative" }}>
        {/* Trigger Button */}
        <button
          type="button"
          id={selectId}
          className="kf-input"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            cursor: disabled ? "not-allowed" : "pointer",
            textAlign: "left",
            width: "100%",
            background: "var(--kf-glass-bg, rgba(255, 255, 255, 0.7))",
            color: (selectedOption || isCustomSelected) ? "inherit" : "var(--kf-muted, #71717a)",
          }}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, marginRight: 8 }}>
            {isCustomSelected
              ? (customValue ? `${customOptionLabel}: ${customValue}` : customOptionLabel)
              : selectedOption
              ? selectedOption.label
              : placeholder}
          </span>
          <ChevronDown size={16} style={{ opacity: 0.6, flexShrink: 0, transform: isOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s ease" }} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              right: 0,
              zIndex: 50,
              background: "var(--kf-surface, #ffffff)",
              border: "1px solid var(--kf-border, rgba(147, 51, 234, 0.2))",
              borderRadius: "10px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
              backdropFilter: "blur(12px)",
              overflow: "hidden",
              maxHeight: "320px",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Search Box */}
            <div
              style={{
                padding: "8px",
                borderBottom: "1px solid var(--kf-border, rgba(147, 51, 234, 0.15))",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                background: "rgba(245, 243, 255, 0.4)",
              }}
            >
              <Search size={14} style={{ color: "var(--kf-muted, #9333ea)", opacity: 0.7 }} />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={searchPlaceholder}
                style={{
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "13px",
                  width: "100%",
                  color: "inherit",
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  style={{ border: "none", background: "transparent", cursor: "pointer", padding: "2px" }}
                >
                  <X size={13} style={{ opacity: 0.6 }} />
                </button>
              )}
            </div>

            {/* Options List */}
            <div style={{ overflowY: "auto", flex: 1, padding: "4px" }}>
              {filteredOptions.length === 0 && !allowCustom ? (
                <div style={{ padding: "12px", textAlign: "center", fontSize: "13px", color: "var(--kf-muted, #71717a)" }}>
                  No matching options found.
                </div>
              ) : (
                filteredOptions.map((opt, index) => {
                  const isSelected = opt.value === value;
                  const prevOpt = index > 0 ? filteredOptions[index - 1] : null;
                  const showGroupHeader = Boolean(opt.group && (!prevOpt || prevOpt.group !== opt.group));

                  return (
                    <div key={opt.value}>
                      {showGroupHeader && (
                        <div
                          style={{
                            padding: "6px 8px 3px",
                            fontSize: "11px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.5px",
                            color: "var(--kf-primary, #7c3aed)",
                            background: "rgba(147, 51, 234, 0.06)",
                            borderRadius: "4px",
                            margin: index > 0 ? "6px 0 2px" : "0 0 2px",
                          }}
                        >
                          {opt.group}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          onChange(opt.value);
                          setIsOpen(false);
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 10px",
                          textAlign: "left",
                          border: "none",
                          borderRadius: "6px",
                          background: isSelected ? "rgba(147, 51, 234, 0.12)" : "transparent",
                          color: isSelected ? "var(--kf-primary, #7c3aed)" : "inherit",
                          fontWeight: isSelected ? 600 : 400,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          fontSize: "13.5px",
                          marginBottom: "2px",
                        }}
                      >
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                          <div>{opt.label}</div>
                          {opt.sublabel && (
                            <div style={{ fontSize: "11.5px", color: "var(--kf-muted, #71717a)", marginTop: "1px" }}>
                              {opt.sublabel}
                            </div>
                          )}
                        </div>
                        {opt.badge && (
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 6px",
                              borderRadius: "12px",
                              background: "rgba(147, 51, 234, 0.1)",
                              color: "var(--kf-primary, #7c3aed)",
                              whiteSpace: "nowrap",
                              marginLeft: "8px",
                            }}
                          >
                            {opt.badge}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })
              )}

              {/* Custom option */}
              {allowCustom && (
                <button
                  type="button"
                  onClick={() => {
                    onChange("__custom__");
                    setIsOpen(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    textAlign: "left",
                    borderTop: "1px solid var(--kf-border, rgba(147, 51, 234, 0.12))",
                    borderRight: "none",
                    borderBottom: "none",
                    borderLeft: "none",
                    borderRadius: "0 0 6px 6px",
                    background: isCustomSelected ? "rgba(147, 51, 234, 0.12)" : "transparent",
                    color: "var(--kf-primary, #7c3aed)",
                    fontWeight: isCustomSelected ? 600 : 500,
                    cursor: "pointer",
                    fontSize: "13px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    marginTop: "4px",
                  }}
                >
                  <span>✨ {customOptionLabel}</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Custom input box if Custom is chosen */}
      {allowCustom && isCustomSelected && (
        <div style={{ marginTop: "6px" }}>
          <input
            type="text"
            className="kf-input"
            value={customValue}
            onChange={(e) => onCustomChange && onCustomChange(e.target.value)}
            placeholder={customPlaceholder}
            required={required}
            autoFocus
          />
        </div>
      )}

      {hint && <p className="kf-field-hint">{hint}</p>}
    </div>
  );
}
