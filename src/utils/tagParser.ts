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
}

export function parseVideoMetadata(filename: string): ParsedMeta {
  const smartTags: Set<string> = new Set();
  const lowerName = filename.toLowerCase();

  // Check if PDF Document
  const isPdf = lowerName.endsWith('.pdf');
  if (isPdf) {
    smartTags.add('PDF');
  }

  // Strip extension
  const nameWithoutExt = filename.replace(/\.[a-zA-Z0-9]+$/, '');
  
  // Replace dots, underscores, dashes with spaces
  const workingName = nameWithoutExt.replace(/[._\-+]/g, ' ');

  // 1. Detect Resolution
  let resolution = isPdf ? 'PDF Doc' : '1080p';
  if (/2160p|4k|uhd|3840x2160/i.test(nameWithoutExt)) {
    resolution = '4K UHD';
    smartTags.add('4K');
  } else if (/1080p|1080i|fhd|1920x1080/i.test(nameWithoutExt)) {
    resolution = '1080p FHD';
    smartTags.add('1080p');
  } else if (/720p|1280x720|hd/i.test(nameWithoutExt)) {
    resolution = '720p HD';
    smartTags.add('720p');
  } else if (/480p|576p|sd|dvdrip/i.test(nameWithoutExt)) {
    resolution = 'SD';
    smartTags.add('SD');
  }

  // 2. Detect HDR & 10bit
  let hdr = false;
  if (/hdr10\+|hdr10|hdr|dolby[\s._-]?vision|dv\b/i.test(nameWithoutExt)) {
    hdr = true;
    smartTags.add('HDR');
  }
  if (/10bit|10[\s._-]?bit|hi10p/i.test(nameWithoutExt)) {
    smartTags.add('10-Bit');
  }

  // 3. Detect Codecs
  let codec: string | undefined;
  if (/x265|h[\s._-]?265|hevc/i.test(nameWithoutExt)) {
    codec = 'HEVC/x265';
    smartTags.add('HEVC');
  } else if (/x264|h[\s._-]?264|avc/i.test(nameWithoutExt)) {
    codec = 'AVC/H.264';
    smartTags.add('H.264');
  } else if (/av1/i.test(nameWithoutExt)) {
    codec = 'AV1';
    smartTags.add('AV1');
  } else if (/vp9/i.test(nameWithoutExt)) {
    codec = 'VP9';
    smartTags.add('VP9');
  }

  // 4. Detect Audio
  let audioChannels: string | undefined;
  if (/atmos|dolby[\s._-]?atmos/i.test(nameWithoutExt)) {
    audioChannels = 'Dolby Atmos';
    smartTags.add('Atmos');
  } else if (/7\.1|7ch/i.test(nameWithoutExt)) {
    audioChannels = '7.1 Surround';
    smartTags.add('7.1');
  } else if (/5\.1|ddp5\.1|dd5\.1|ac3|dts[\s._-]?5\.1|6ch/i.test(nameWithoutExt)) {
    audioChannels = '5.1 Surround';
    smartTags.add('5.1');
  } else if (/stereo|2\.0|aac2\.0/i.test(nameWithoutExt)) {
    audioChannels = 'Stereo';
  }

  // 5. Detect Frame Rate
  if (/60fps|60p\b|59\.94fps/i.test(nameWithoutExt)) {
    smartTags.add('60 FPS');
  } else if (/120fps|120p\b/i.test(nameWithoutExt)) {
    smartTags.add('120 FPS');
  }

  // 6. Detect Quality Source
  if (/remux/i.test(nameWithoutExt)) smartTags.add('Remux');
  else if (/bluray|bdrip|brrip/i.test(nameWithoutExt)) smartTags.add('BluRay');
  else if (/web-dl|webdl|webrip/i.test(nameWithoutExt)) smartTags.add('WEB-DL');
  else if (/imax/i.test(nameWithoutExt)) smartTags.add('IMAX');

  // 7. Detect Season & Episode (e.g. S01E03 or 1x03)
  let season: number | undefined;
  let episode: number | undefined;
  const sMatch = nameWithoutExt.match(/[sS](\d{1,2})[eE](\d{1,2})/);
  if (sMatch) {
    season = parseInt(sMatch[1], 10);
    episode = parseInt(sMatch[2], 10);
    smartTags.add(`S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}`);
  } else {
    const epMatch = nameWithoutExt.match(/(\d{1,2})x(\d{1,2})/);
    if (epMatch) {
      season = parseInt(epMatch[1], 10);
      episode = parseInt(epMatch[2], 10);
      smartTags.add(`S${season.toString().padStart(2, '0')}E${episode.toString().padStart(2, '0')}`);
    }
  }

  // 8. Detect Year (1940 - 2035)
  let year: number | undefined;
  const yearMatch = nameWithoutExt.match(/\b(19\d\d|20[0-3]\d)\b/);
  if (yearMatch) {
    year = parseInt(yearMatch[1], 10);
    smartTags.add(year.toString());
  }

  // 9. Extract Clean Title & Significant Tokens from Title Name
  const words = workingName.split(/\s+/);
  const titleTokens: string[] = [];

  for (const word of words) {
    const isYear = year && word === year.toString();
    const isSeasonEp = sMatch && new RegExp(`s0?${season}e0?${episode}`, 'i').test(word);
    const isTechTag = /^(2160p|1080p|720p|480p|4k|uhd|fhd|hevc|x264|x265|h264|h265|hdr|bluray|webdl|web-dl|webrip|remux|aac|ac3|dts|atmos|ddp5|10bit|flac|mp3|xvid|divx|flv|repack|proper|extended|unrated|criterion|pdf)$/i.test(word);

    if (isYear || isSeasonEp || isTechTag) {
      if (titleTokens.length > 0) break;
    }
    titleTokens.push(word);
  }

  let cleanTitle = titleTokens.join(' ').trim();
  if (!cleanTitle) {
    cleanTitle = nameWithoutExt.replace(/[-_.]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Format nicely
  cleanTitle = cleanTitle
    .split(' ')
    .map(w => w.length > 0 ? (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : '')
    .join(' ');

  // For titles that have meaningful category words in the title itself (e.g. "Tutorial", "Documentary", "Trailer", "Notes", "Paper")
  const titleWords = cleanTitle.split(/\s+/);
  for (const tw of titleWords) {
    if (tw.length >= 4 && !/^(the|and|for|with|from|this|that|your|have)$/i.test(tw)) {
      if (smartTags.size < 4 && !smartTags.has(tw)) {
        smartTags.add(tw);
      }
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
  };
}
