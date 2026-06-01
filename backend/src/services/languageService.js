const OpenAI = require('openai');
const supabase = require('../config/supabase');

const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English', whisperCode: 'en' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', whisperCode: 'hi' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', whisperCode: 'mr' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', whisperCode: 'gu' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', whisperCode: 'bn' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', whisperCode: 'ta' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', whisperCode: 'te' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', whisperCode: 'kn' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', whisperCode: 'ml' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', whisperCode: 'pa' },
];

const DEFAULT_LANGUAGE = 'en';
const LANGUAGE_CODES = new Set(SUPPORTED_LANGUAGES.map((language) => language.code));
const LANGUAGE_ALIASES = {
  eng: 'en',
  hin: 'hi',
  mar: 'mr',
  guj: 'gu',
  ben: 'bn',
  tam: 'ta',
  tel: 'te',
  kan: 'kn',
  mal: 'ml',
  pan: 'pa',
  pun: 'pa',
};

let openaiClient;

function normalizeLanguage(value) {
  if (!value) return DEFAULT_LANGUAGE;
  const first = String(value).trim().toLowerCase().split(',')[0].split(';')[0];
  const base = first.replace('_', '-').split('-')[0];
  const code = LANGUAGE_ALIASES[base] || base;
  return LANGUAGE_CODES.has(code) ? code : DEFAULT_LANGUAGE;
}

function getLanguageMeta(code) {
  const normalized = normalizeLanguage(code);
  return SUPPORTED_LANGUAGES.find((language) => language.code === normalized) || SUPPORTED_LANGUAGES[0];
}

function resolveRequestLanguage(req) {
  return normalizeLanguage(
    req.query?.lang
    || req.body?.language_code
    || req.body?.preferred_language
    || req.user?.preferred_language
    || req.get?.('accept-language')
  );
}

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) {
    const err = new Error('OpenAI API key is not configured');
    err.code = 'OPENAI_NOT_CONFIGURED';
    throw err;
  }
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

function originalTranslationRow(issue, languageCode = issue.original_language) {
  const normalized = normalizeLanguage(languageCode);
  return {
    issue_id: issue.id,
    language_code: normalized,
    source_language: normalized,
    title: issue.title,
    description: issue.description || null,
    location_label: issue.location_label || null,
    provider: 'original',
    updated_at: new Date().toISOString(),
  };
}

function applyTranslation(issue, translation, languageCode, status) {
  return {
    ...issue,
    title: translation?.title || issue.title,
    description: translation?.description ?? issue.description,
    location_label: translation?.location_label ?? issue.location_label,
    language_code: normalizeLanguage(languageCode),
    translation_status: status,
  };
}

async function upsertOriginalTranslation(issue, languageCode = issue.original_language) {
  if (!issue?.id) return null;
  const row = originalTranslationRow(issue, languageCode);
  const { data, error } = await supabase
    .from('issue_translations')
    .upsert(row, { onConflict: 'issue_id,language_code' })
    .select('title, description, location_label, language_code, source_language, provider')
    .single();
  if (error) throw error;
  return data;
}

async function translateIssueText(issue, targetLanguage) {
  const target = getLanguageMeta(targetLanguage);
  const source = getLanguageMeta(issue.original_language || DEFAULT_LANGUAGE);
  const openai = getOpenAIClient();
  const completion = await openai.chat.completions.create({
    model: process.env.OPENAI_TRANSLATION_MODEL || 'gpt-4o-mini',
    temperature: 0.1,
    max_tokens: 700,
    messages: [
      {
        role: 'system',
        content: `Translate civic issue text from ${source.name} to ${target.name}.
Return only valid JSON with keys title, description, location_label.
Preserve names, ward/city/state names, representative names, category/status enum words, phone numbers, email addresses, URLs, and measurements.
Keep the title concise and natural for a citizen-facing civic app.`,
      },
      {
        role: 'user',
        content: JSON.stringify({
          title: issue.title || '',
          description: issue.description || '',
          location_label: issue.location_label || '',
        }),
      },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content || '{}';
  const cleaned = raw.replace(/```json|```/g, '').trim();
  const translated = JSON.parse(cleaned);
  return {
    issue_id: issue.id,
    language_code: target.code,
    source_language: normalizeLanguage(issue.original_language),
    title: translated.title || issue.title,
    description: translated.description || issue.description || null,
    location_label: translated.location_label || issue.location_label || null,
    provider: 'openai',
    translated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function getExistingTranslations(issueIds, languageCode) {
  if (!issueIds.length) return new Map();
  const { data, error } = await supabase
    .from('issue_translations')
    .select('issue_id, language_code, source_language, title, description, location_label, provider')
    .eq('language_code', languageCode)
    .in('issue_id', issueIds);
  if (error) throw error;
  return new Map((data || []).map((row) => [row.issue_id, row]));
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let index = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const current = index;
      index += 1;
      results[current] = await mapper(items[current], current);
    }
  });
  await Promise.all(workers);
  return results;
}

async function ensureIssueTranslation(issue, languageCode) {
  const normalized = normalizeLanguage(languageCode);
  const originalLanguage = normalizeLanguage(issue.original_language);

  if (normalized === originalLanguage) {
    const original = await upsertOriginalTranslation(issue, originalLanguage);
    return applyTranslation(issue, original, normalized, 'original');
  }

  try {
    const { data: existing, error } = await supabase
      .from('issue_translations')
      .select('issue_id, language_code, source_language, title, description, location_label, provider')
      .eq('issue_id', issue.id)
      .eq('language_code', normalized)
      .maybeSingle();
    if (error) throw error;
    if (existing) return applyTranslation(issue, existing, normalized, 'cached');

    const translated = await translateIssueText(issue, normalized);
    const { data, error: upsertError } = await supabase
      .from('issue_translations')
      .upsert(translated, { onConflict: 'issue_id,language_code' })
      .select('issue_id, language_code, source_language, title, description, location_label, provider')
      .single();
    if (upsertError) throw upsertError;
    return applyTranslation(issue, data, normalized, 'translated');
  } catch (err) {
    console.warn(`Issue translation fallback for ${issue.id}/${normalized}: ${err.message}`);
    return applyTranslation(issue, null, normalized, 'fallback');
  }
}

async function localizeIssues(issues, languageCode) {
  const normalized = normalizeLanguage(languageCode);
  if (!Array.isArray(issues) || !issues.length) return issues || [];

  let existing = new Map();
  try {
    existing = await getExistingTranslations(issues.map((issue) => issue.id), normalized);
  } catch (err) {
    console.warn(`Could not read issue translations: ${err.message}`);
  }

  return mapWithConcurrency(issues, 4, async (issue) => {
    const originalLanguage = normalizeLanguage(issue.original_language);
    const cached = existing.get(issue.id);
    if (cached) {
      return applyTranslation(issue, cached, normalized, normalized === originalLanguage ? 'original' : 'cached');
    }
    return ensureIssueTranslation(issue, normalized);
  });
}

async function primeIssueTranslations(issue) {
  if (!process.env.OPENAI_API_KEY || !issue?.id) return;
  const originalLanguage = normalizeLanguage(issue.original_language);
  for (const language of SUPPORTED_LANGUAGES) {
    if (language.code !== originalLanguage) {
      await ensureIssueTranslation(issue, language.code);
    }
  }
}

module.exports = {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  normalizeLanguage,
  getLanguageMeta,
  resolveRequestLanguage,
  upsertOriginalTranslation,
  ensureIssueTranslation,
  localizeIssues,
  primeIssueTranslations,
};
