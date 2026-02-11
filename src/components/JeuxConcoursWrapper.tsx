"use client";
import React from "react";
import { useEffect, useState } from "react";
import JeuxConcoursCard from "./JeuxConcoursCard";

export default function JeuxConcoursWrapper() {
  const KEY = "showJeuxConcours";
  const [visible, setVisible] = useState<boolean>(true);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw === null) {
        // default: show the card and persist preference
        setVisible(true);
        localStorage.setItem(KEY, "1");
      } else {
        setVisible(raw === "1");
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const toggle = () => {
    try {
      const next = !visible;
      setVisible(next);
      localStorage.setItem(KEY, next ? "1" : "0");
    } catch {}
  };

  return (
    <div className="relative">
      <div className="fixed right-6 bottom-6 z-50">
        <button onClick={toggle} className="btn-primary px-4 py-2 rounded-full">{visible ? "Cacher Jeux" : "Montrer Jeux"}</button>
      </div>
      <div className="container mt-8">
        {visible && (
          <div className="max-w-4xl mx-auto">
            <JeuxConcoursCard />
          </div>
        )}
      </div>
    </div>
  );
}
