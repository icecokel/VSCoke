export const BLOG_SPEECH_CONTENT_ID = "blog-post-content";
export const BLOG_SPEECH_EXCLUDE_SELECTOR = "[data-blog-speech-exclude]";
export const BLOG_SPEECH_SEGMENT_SELECTOR = "[data-blog-speech-segment]";

const DEFAULT_MAX_SEGMENT_LENGTH = 240;
const sentencePattern = /[^.!?。！？]+(?:[.!?。！？]+|$)/g;

interface CreateBlogSpeechSegmentsOptions {
  contentSegments: string[];
  description: string;
  maxSegmentLength?: number;
  title: string;
}

export const normalizeBlogSpeechText = (text: string): string => {
  return text.replace(/\s+/g, " ").trim();
};

const splitOversizedPart = (text: string, maxSegmentLength: number): string[] => {
  const parts: string[] = [];
  let remainingText = text;

  while (remainingText.length > maxSegmentLength) {
    const candidate = remainingText.slice(0, maxSegmentLength + 1);
    const whitespaceIndex = candidate.lastIndexOf(" ");
    const splitIndex =
      whitespaceIndex >= Math.floor(maxSegmentLength / 2) ? whitespaceIndex : maxSegmentLength;

    parts.push(remainingText.slice(0, splitIndex).trim());
    remainingText = remainingText.slice(splitIndex).trim();
  }

  if (remainingText) {
    parts.push(remainingText);
  }

  return parts;
};

export const splitBlogSpeechText = (
  text: string,
  maxSegmentLength = DEFAULT_MAX_SEGMENT_LENGTH,
): string[] => {
  const normalizedText = normalizeBlogSpeechText(text);

  if (!normalizedText) {
    return [];
  }

  if (maxSegmentLength < 1) {
    return [normalizedText];
  }

  const sentences = normalizedText.match(sentencePattern) ?? [normalizedText];
  const segments: string[] = [];
  let currentSegment = "";

  const flushCurrentSegment = () => {
    if (currentSegment) {
      segments.push(currentSegment);
      currentSegment = "";
    }
  };

  for (const sentence of sentences) {
    const normalizedSentence = normalizeBlogSpeechText(sentence);

    if (normalizedSentence.length > maxSegmentLength) {
      flushCurrentSegment();
      segments.push(...splitOversizedPart(normalizedSentence, maxSegmentLength));
      continue;
    }

    const combinedSegment = normalizeBlogSpeechText(`${currentSegment} ${normalizedSentence}`);
    if (currentSegment && combinedSegment.length > maxSegmentLength) {
      flushCurrentSegment();
      currentSegment = normalizedSentence;
      continue;
    }

    currentSegment = combinedSegment;
  }

  flushCurrentSegment();
  return segments;
};

export const createBlogSpeechSegments = ({
  contentSegments,
  description,
  maxSegmentLength,
  title,
}: CreateBlogSpeechSegmentsOptions): string[] => {
  return [title, description, ...contentSegments].flatMap(segment =>
    splitBlogSpeechText(segment, maxSegmentLength),
  );
};
