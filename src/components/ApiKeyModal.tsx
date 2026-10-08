import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { KeyRound, Shield, Check, X, ExternalLink } from "lucide-react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  onSaveApiKey: (key: string) => void;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  apiKey,
  onSaveApiKey,
}: ApiKeyModalProps) {
  const [inputVal, setInputVal] = useState(apiKey);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveApiKey(inputVal.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1200);
  };

  const handleClear = () => {
    setInputVal("");
    onSaveApiKey("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in-50">
      <div className="w-full max-w-md rounded-xl border bg-background shadow-2xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <KeyRound className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Bright Data API Key Settings</h3>
              <p className="text-[11px] text-muted-foreground">
                Required to scrape any live Instagram username
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="space-y-3 text-xs">
          <div>
            <label className="font-medium text-foreground block mb-1.5">
              Your Bright Data API Key
            </label>
            <input
              type="password"
              placeholder="e.g. bfa48d9e-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 font-mono text-xs shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-[10px] text-muted-foreground mt-1">
              Stored locally in your browser session/localStorage. It will never be publicly exposed.
            </p>
          </div>

          {/* Vercel Hosting Instructions Callout */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-1.5">
            <div className="flex items-center space-x-1.5 font-medium text-foreground">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span>Hosting on Vercel:</span>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              When deployed to Vercel, you can set <code className="bg-muted px-1 py-0.5 rounded font-mono">BRIGHTDATA_API_KEY</code> in your <strong>Vercel Project Settings &rarr; Environment Variables</strong> so you don't even need to enter it manually in the browser!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          {inputVal ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="text-xs text-destructive hover:bg-destructive/10 h-8"
            >
              Clear Key
            </Button>
          ) : (
            <div />
          )}

          <div className="flex space-x-2">
            <Button variant="outline" size="sm" onClick={onClose} className="h-8 text-xs">
              Cancel
            </Button>
            <Button variant="default" size="sm" onClick={handleSave} className="h-8 text-xs space-x-1">
              {saved ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Saved!</span>
                </>
              ) : (
                <span>Save Key</span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
