"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import { Star } from "lucide-react";
import { t } from "@kaesava/i18n";
import { Button, Spinner, useToast } from "@kaesava/ui/web";
import "../../../i18n";

export default function ReviewPortalPage() {
  const { token } = useParams<{ token: string }>();
  const { success } = useToast();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 flex items-center justify-center">
      <div className="ui-card max-w-md w-full p-6 space-y-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">{t("tradieWeb.reviewTitle")}</h1>
          <p className="text-sm text-slate-500 mt-1">{t("tradieWeb.reviewSubtitle")}</p>
        </div>

        {submitted ? (
          <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 p-4 text-sm text-emerald-800 dark:text-emerald-200 font-medium">
            {t("tradieWeb.reviewThankYou")}
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(true);
              success(t("tradieWeb.reviewThankYou"));
            }}
            className="space-y-4"
          >
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  aria-label={`${star} ${t("tradieWeb.starsLabel")}`}
                >
                  <Star className={`w-7 h-7 ${star <= rating ? "text-amber-500 fill-amber-500" : "text-slate-300 dark:text-slate-600"}`} />
                </button>
              ))}
            </div>
            <textarea
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={t("tradieWeb.reviewCommentPlaceholder")}
              className="w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 text-sm"
            />
            <Button type="submit" className="w-full">{t("tradieWeb.submitReviewAction")}</Button>
          </form>
        )}
      </div>
    </main>
  );
}
