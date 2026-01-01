
// api/quality/socialLinkValidator.ts

export const socialLinkValidator = {
  patterns: {
    // Covers: posts (/p/), reels (/reel/), tv (/tv/), stories (/stories/)
    instagram: /^https?:\/\/(?:www\.)?(?:instagram\.com|instagr\.am)\/(?:p|reel|tv|stories)\/[a-zA-Z0-9_-]+\/?/i,
    
    // Covers: standard web links (@user/video/id), shortened links (vm.tiktok.com, vt.tiktok.com)
    tiktok: /^https?:\/\/(?:www\.|vm\.|vt\.)?tiktok\.com\/(?:@[\w\.-]+\/video\/\d+|[\w-]+\/?)/i,
    
    // Covers: standard watch URLs, shorts, and youtu.be shortlinks
    youtube: /^https?:\/\/(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/)|youtu\.be\/)[a-zA-Z0-9_-]+/i
  },
  
  isValid(url: string): boolean {
    if (!url) return false;
    const trimmedUrl = url.trim();
    // Use type assertion to RegExp since Object.values infers any/unknown here
    return Object.values(this.patterns).some((pattern: any) => (pattern as RegExp).test(trimmedUrl));
  },
  
  getPlatform(url: string): 'instagram' | 'tiktok' | 'youtube' | null {
    const trimmedUrl = url.trim();
    for (const [platform, pattern] of Object.entries(this.patterns)) {
      if ((pattern as RegExp).test(trimmedUrl)) return platform as any;
    }
    return null;
  }
};
