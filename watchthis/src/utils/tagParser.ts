export interface ParsedMeta {
  cleanTitle: string;
  year?: number;
  season?: number;
  episode?: number;
  resolution: string;
  codec?: string;
  hdr?: boolean;
  audioChannels?: string;
  smartTags: string[];
  isPdf?: boolean;
  isNsfw?: boolean;
}

// Common HTML entities to clean out
const HTML_ENTITY_REGEX = /&(?:amp|quot|apos|lt|gt|#39|#x27|#039|agrave|eacute|egrave|ouml|uuml|auml|ccedil|icirc|ocirc|ucirc|ntilde|Agrave|Eacute|Egrave|Ouml|Uuml|Auml|Ccedil);?/gi;

// Warez, site domains, bracketed upload groups, and tracker noise
const FILLER_BRACKETS_REGEX = /\[(?:FreeCourseLab(?:\.com)?|courseclub(?:\.me)?|tutsgalaxy(?:\.com)?|1337x|rarbg|eztv|TGx|YTS(?:\.MX|\.LT)?|YIFY|PSA|Torrenting|EZTVx\.to|www\.[^\]]+|[^\]]*\.(?:com|org|net|me|to|io|in|tv|cc|cx|xyz))\]/gi;
const FILLER_WORDS_REGEX = /\b(www\.[a-z0-9.\-_]+\.[a-z]{2,}|https?:\/\/\S+|FreeCourseLab|courseclub|tutsgalaxy|1337x|rarbg|eztv|yify|yts|downloaded|complete|sample|repack|proper|extended|unrated|criterion|torrenting)\b/gi;
const NSFW_KEYWORDS_REGEX = /\b(nsfw|18\+|adult|erotic|hentai|uncensored|explicit|jav|xxx|nude|gore|blowjob|anal|booty|pussy|dick|fap)\b/i;

// Comprehensive Stop Words (Fillers: in, of, the, this, that, with, for, from, etc.)
const STOP_WORDS = new Set([
  'in', 'of', 'the', 'this', 'that', 'with', 'for', 'from', 'to', 'at', 'by', 'an', 'a',
  'and', 'or', 'is', 'are', 'was', 'were', 'it', 'its', 'as', 'be', 'been', 'have', 'has',
  'had', 'do', 'does', 'did', 'but', 'if', 'then', 'else', 'when', 'where', 'why', 'how',
  'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor',
  'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'don',
  'should', 'now', 'their', 'they', 'them', 'these', 'those', 'what', 'which', 'who', 'whom',
  'whose', 'your', 'you', 'our', 'ours', 'my', 'mine', 'me', 'him', 'her', 'his', 'hers',
  'into', 'onto', 'upon', 'over', 'under', 'above', 'below', 'between', 'through', 'during',
  'before', 'after', 'about', 'against', 'among', 'via', 'per', 'vs', 'versus', 'like', 'also',
  'well', 'even', 'back', 'there', 'here', 'much', 'many', 'way', 'made', 'make', 'part', 'see',
  // Domain / rip fillers
  'com', 'org', 'net', 'udemy', 'course', 'tutorial', 'freecourselab', 'courseclub', 'tutsgalaxy',
  'rarbg', 'eztv', 'yify', 'yts', 'sample', 'repack', 'proper', 'extended', 'unrated', 'criterion',
  'edition', 'version', 'volume', 'chapter', 'section', 'episode', 'season', 'remastered', 'complete',
  'hdrip', 'webrip', 'bluray', 'bdrip', 'brrip', 'webdl', 'remux', 'xvid', 'divx', 'aac', 'ac3', 'dts',
  'flac', 'mp3', 'mp4', 'mkv', 'avi', 'hevc', 'avc', 'fhd', 'uhd', 'hdr', 'x264', 'x265', 'h264', 'h265',
  'vp9', 'av1', 'sub', 'subs', 'multi', 'dual', 'ita', 'eng', 'ger', 'fra', 'spa', 'rus', 'jpn', 'kor',
  'chs', 'cht', 'rip', 'encode', 'pdf', 'doc', 'docx', 'file', 'video', 'audio', 'track', 'disc', 'cd'
]);

/**
 * Extracts clean, alphabetic keywords from a string or filename,
 * strictly filtering out numbers, HTML entities, and filler stop words.
 */
export function extractCleanKeywords(input: string): string[] {
  if (!input) return [];

  // 1. Clean HTML entities
  let cleaned = input.replace(HTML_ENTITY_REGEX, ' ');

  // 2. Clean warez / domain brackets
  cleaned = cleaned.replace(FILLER_BRACKETS_REGEX, ' ');
  cleaned = cleaned.replace(FILLER_WORDS_REGEX, ' ');

  // 3. Remove file extension
  cleaned = cleaned.replace(/\.[a-zA-Z0-9]{2,5}$/, '');

  // 4. Split camelCase words (e.g. ArtificialIntelligence -> Artificial Intelligence)
  cleaned = cleaned.replace(/([a-z])([A-Z])/g, '$1 $2');

  // 5. Replace all non-alphabetical characters with space (strictly NO numbers or symbols)
  cleaned = cleaned.replace(/[^a-zA-Z\s]/g, ' ');

  // 6. Split into tokens
  const rawTokens = cleaned.split(/\s+/).filter(Boolean);
  const keywords: string[] = [];
  const seen = new Set<string>();

  for (const token of rawTokens) {
    const lower = token.toLowerCase().trim();

    // Must be at least 3 characters, strictly alphabetic, and not in STOP_WORDS
    if (lower.length >= 3 && /^[a-zA-Z]+$/.test(token) && !STOP_WORDS.has(lower)) {
      // Format with Title Case
      const formatted = lower.charAt(0).toUpperCase() + lower.slice(1);
      if (!seen.has(lower)) {
        seen.add(lower);
        keywords.push(formatted);
      }
    }
  }

  return keywords;
}

export function parseVideoMetadata(filename: string): ParsedMeta {
  const smartTags: Set<string> = new Set();
  const lowerName = filename.toLowerCase();

  // Check if PDF Document
  const isPdf = lowerName.endsWith('.pdf');

  // Check for NSFW / Adult Content
  let isNsfw = false;
  if (NSFW_KEYWORDS_REGEX.test(filename)) {
    isNsfw = true;
  }

  // Strip extension
  let nameWithoutExt = filename.replace(/\.[a-zA-Z0-9]+$/, '');
  
  // Clean HTML entities & website ads
  nameWithoutExt = nameWithoutExt.replace(HTML_ENTITY_REGEX, ' ');
  nameWithoutExt = nameWithoutExt.replace(FILLER_BRACKETS_REGEX, ' ');
  nameWithoutExt = nameWithoutExt.replace(FILLER_WORDS_REGEX, ' ');

  // 1. Detect Resolution
  let resolution = isPdf ? 'PDF Doc' : '1080p';
  if (/2160p|4k|uhd|3840x2160/i.test(nameWithoutExt)) {
    resolution = '4K UHD';
  } else if (/1080p|1080i|fhd|1920x1080/i.test(nameWithoutExt)) {
    resolution = '1080p';
  } else if (/720p|1280x720|hd/i.test(nameWithoutExt)) {
    resolution = '720p';
  } else if (/480p|576p|sd|dvdrip/i.test(nameWithoutExt)) {
    resolution = 'SD';
  }

  // 2. Detect HDR & 10bit
  let hdr = false;
  if (/hdr10\+|hdr10|hdr|dolby[\s._-]?vision|dv\b/i.test(nameWithoutExt)) {
    hdr = true;
  }

  // 3. Detect Codecs
  let codec: string | undefined;
  if (/x265|h[\s._-]?265|hevc/i.test(nameWithoutExt)) {
    codec = 'HEVC';
  } else if (/x264|h[\s._-]?264|avc/i.test(nameWithoutExt)) {
    codec = 'H.264';
  } else if (/av1/i.test(nameWithoutExt)) {
    codec = 'AV1';
  } else if (/vp9/i.test(nameWithoutExt)) {
    codec = 'VP9';
  }

  // 4. Detect Audio
  let audioChannels: string | undefined;
  if (/atmos|dolby[\s._-]?atmos/i.test(nameWithoutExt)) {
    audioChannels = 'Dolby Atmos';
  } else if (/7\.1|7ch/i.test(nameWithoutExt)) {
    audioChannels = '7.1 Surround';
  } else if (/5\.1|ddp5\.1|dd5\.1|ac3|dts[\s._-]?5\.1|6ch/i.test(nameWithoutExt)) {
    audioChannels = '5.1 Surround';
  } else if (/stereo|2\.0|aac2\.0/i.test(nameWithoutExt)) {
    audioChannels = 'Stereo';
  }

  // 5. Detect Year (for cleanTitle parsing)
  let year: number | undefined;
  const yearMatch = nameWithoutExt.match(/\b(19\d\d|20[0-3]\d)\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
  }

  // 6. Detect Season & Episode
  let season: number | undefined;
  let episode: number | undefined;
  const sMatch = nameWithoutExt.match(/[sS](\d{1,2})[eE](\d{1,2})/);
  if (sMatch) {
    season = parseInt(sMatch[1], 10);
    episode = parseInt(sMatch[2], 10);
  } else {
    const epMatch = nameWithoutExt.match(/(\d{1,2})x(\d{1,2})/);
    if (epMatch) {
      season = parseInt(epMatch[1], 10);
      episode = parseInt(epMatch[2], 10);
    }
  }

  // 7. Extract Clean Title & Significant Semantic Tokens
  const workingName = nameWithoutExt.replace(/[._\-+]/g, ' ').replace(/\s+/g, ' ').trim();
  const words = workingName.split(/\s+/);
  const titleTokens: string[] = [];

  for (const word of words) {
    const isYear = year && word === year.toString();
    const isSeasonEp = sMatch && new RegExp(`s0?${season}e0?${episode}`, 'i').test(word);
    const isTechTag = /^(2160p|1080p|720p|480p|4k|uhd|fhd|hevc|x264|x265|h264|h265|hdr|bluray|webdl|web-dl|webrip|remux|aac|ac3|dts|atmos|ddp5|10bit|flac|mp3|xvid|divx|flv|repack|proper|extended|unrated|criterion|pdf|udemy|course)$/i.test(word);

    if (isYear || isSeasonEp || isTechTag) {
      if (titleTokens.length > 0) break;
    }
    titleTokens.push(word);
  }

  let cleanTitle = titleTokens.join(' ').trim();
  if (!cleanTitle) {
    cleanTitle = workingName;
  }

  // Format nicely
  cleanTitle = cleanTitle
    .split(' ')
    .map(w => w.length > 0 ? (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : '')
    .join(' ');

  // 8. Extract STRICTLY ALPHABETIC keywords (NO NUMBERS, NO FILLERS)
  const cleanKeywords = extractCleanKeywords(filename);
  for (const kw of cleanKeywords) {
    if (smartTags.size < 6) {
      smartTags.add(kw);
    }
  }

  return {
    cleanTitle,
    year,
    season,
    episode,
    resolution,
    codec,
    hdr,
    audioChannels,
    smartTags: Array.from(smartTags),
    isPdf,
    isNsfw,
  };
}

