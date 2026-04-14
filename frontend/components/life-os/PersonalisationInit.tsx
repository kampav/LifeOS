"use client";
/**
 * PersonalisationInit — fetches user prefs on session start and applies CSS variables.
 * Renders nothing; side-effect only.
 */
import { useEffect } from "react";
import { api } from "@/lib/api";
import { applyPersonalisation } from "@/lib/personalisation";

export function PersonalisationInit() {
  useEffect(() => {
    api.get("/users/me/personalisation")
      .then(r => {
        if (r.data && typeof r.data === "object") {
          applyPersonalisation(r.data);
        }
      })
      .catch(() => {/* fail silently — cosmetic */});
  }, []);
  return null;
}
