import React from 'react';
import { Play } from 'lucide-react';

export interface VideoChapter {
  seconds: number;
  timeStr: string;
  title: string;
  rawLine: string;
}

/**
 * Converts a time string like "01:23", "1:45", "00:30", "1:02:30" into total seconds.
 */
export function parseTimeStringToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':').map(p => parseInt(p, 10));
  if (parts.some(p => isNaN(p))) return 0;

  if (parts.length === 3) {
    // HH:MM:SS
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  } else if (parts.length === 2) {
    // MM:SS
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 1) {
    return parts[0];
  }
  return 0;
}

/**
 * Converts seconds into formatted time string: "MM:SS" or "HH:MM:SS"
 */
export function formatSecondsToTimeString(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds < 0) return '00:00';
  const secs = Math.floor(totalSeconds);
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats total watch seconds into readable hours / minutes representation.
 * Examples: "0.5 ساعة", "12.4 ساعة", "45 دقيقة"
 */
export function formatWatchHours(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds) || totalSeconds <= 0) return '0 ساعة';
  const hours = totalSeconds / 3600;
  if (hours < 0.1) {
    const mins = Math.max(1, Math.round(totalSeconds / 60));
    return `${mins} دقيقة (${(hours).toFixed(2)} س)`;
  }
  if (hours < 10) {
    return `${hours.toFixed(1)} ساعة`;
  }
  return `${Math.round(hours)} ساعة`;
}

/**
 * Extracts chapters and bookmarks from video description lines.
 * Looks for timestamp patterns: e.g. "01:15 مقدمة الفيديو", "00:00 - البداية", "شرح التطبيق 04:30"
 */
export function extractChaptersFromDescription(description: string): VideoChapter[] {
  if (!description) return [];

  const lines = description.split('\n');
  const chapters: VideoChapter[] = [];
  // Regex to match timestamps like 00:00, 1:23, 01:23, 01:23:45, 1:05:30
  const timeRegex = /(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)/;

  for (const line of lines) {
    const match = line.match(timeRegex);
    if (match) {
      const timeStr = match[0];
      const seconds = parseTimeStringToSeconds(timeStr);
      // Clean chapter title by removing the timestamp, dashes, colons and excessive spaces
      let title = line
        .replace(timeStr, '')
        .replace(/^[\s\-–—:•|]+/, '')
        .replace(/[\s\-–—:•|]+$/, '')
        .trim();

      if (!title) {
        title = `فصل ${timeStr}`;
      }

      chapters.push({
        seconds,
        timeStr,
        title,
        rawLine: line.trim()
      });
    }
  }

  // Sort chapters ascending by seconds and filter unique seconds
  chapters.sort((a, b) => a.seconds - b.seconds);
  const uniqueChapters: VideoChapter[] = [];
  const seenSeconds = new Set<number>();

  for (const ch of chapters) {
    if (!seenSeconds.has(ch.seconds)) {
      seenSeconds.add(ch.seconds);
      uniqueChapters.push(ch);
    }
  }

  return uniqueChapters;
}

/**
 * Renders text with clickable interactive timestamps.
 * Any timestamp like 01:23 is converted into a clickable button that invokes onSeek(seconds, timeStr).
 */
export function renderTextWithClickableTimestamps(
  text: string,
  onSeek: (seconds: number, timeStr: string) => void
): React.ReactNode {
  if (!text) return null;

  // Regex matching timestamps
  const timeRegex = /\b(?:(\d{1,2}):)?([0-5]?\d):([0-5]\d)\b/g;

  const lines = text.split('\n');

  return (
    <>
      {lines.map((line, lineIdx) => {
        const elements: React.ReactNode[] = [];
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        timeRegex.lastIndex = 0;
        while ((match = timeRegex.exec(line)) !== null) {
          const matchStart = match.index;
          const matchEnd = match.index + match[0].length;
          const timeStr = match[0];
          const seconds = parseTimeStringToSeconds(timeStr);

          // Add text before match
          if (matchStart > lastIndex) {
            elements.push(line.substring(lastIndex, matchStart));
          }

          // Add clickable timestamp badge
          elements.push(
            <button
              key={`${lineIdx}-${matchStart}-${timeStr}`}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSeek(seconds, timeStr);
              }}
              title={`تشغيل الفيديو عند التوقيت ${timeStr}`}
              className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-lg bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 hover:border-cyan-400 text-cyan-300 hover:text-cyan-200 font-mono text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer align-middle group"
            >
              <Play className="w-2.5 h-2.5 fill-cyan-400 text-cyan-400 group-hover:scale-110 transition-transform" />
              <span className="underline underline-offset-2 decoration-cyan-500/50">{timeStr}</span>
            </button>
          );

          lastIndex = matchEnd;
        }

        // Add trailing text
        if (lastIndex < line.length) {
          elements.push(line.substring(lastIndex));
        }

        return (
          <React.Fragment key={lineIdx}>
            {elements.length > 0 ? elements : line}
            {lineIdx < lines.length - 1 && <br />}
          </React.Fragment>
        );
      })}
    </>
  );
}
