const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Language markers → locale codes
const LANG_MARKERS = {
  'English': 'en',
  'Čeština': 'cs',
  'Deutsch': 'de',
  'Русский': 'ru',
  'Українська': 'uk',
};

const MARKER_REGEX = /^(English|Čeština|Deutsch|Русский|Українська)\s*[—–-]\s*/;

function parseMultiLangDescription(description) {
  if (!description) return null;

  const lines = description.split('\n');
  const sections = {};
  let currentLocale = null;
  let currentTitle = '';
  let currentBody = [];

  for (const line of lines) {
    const match = line.match(MARKER_REGEX);
    if (match) {
      // Save previous section
      if (currentLocale) {
        sections[currentLocale] = {
          title: currentTitle.trim(),
          description: currentBody.join('\n').trim(),
        };
      }
      // Start new section
      const langName = match[1];
      currentLocale = LANG_MARKERS[langName];
      currentTitle = line.replace(MARKER_REGEX, '').trim();
      currentBody = [];
    } else if (currentLocale) {
      // Check if this is a metadata line (📅, Source:, Photo:)
      if (line.startsWith('📅') || line.startsWith('Source:') || line.startsWith('Photo:')) {
        // End of content sections
        if (currentLocale) {
          sections[currentLocale] = {
            title: currentTitle.trim(),
            description: currentBody.join('\n').trim(),
          };
          currentLocale = null;
        }
      } else {
        currentBody.push(line);
      }
    }
  }

  // Save last section
  if (currentLocale) {
    sections[currentLocale] = {
      title: currentTitle.trim(),
      description: currentBody.join('\n').trim(),
    };
  }

  // Must have at least English + one other language
  if (!sections.en || Object.keys(sections).length < 2) return null;

  return sections;
}

async function migrate() {
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, description')
    .eq('is_system', true);

  if (error) {
    console.error('Failed to fetch events:', error.message);
    return;
  }

  let updated = 0;
  let skipped = 0;

  for (const event of events) {
    const sections = parseMultiLangDescription(event.description);
    if (!sections) {
      skipped++;
      continue;
    }

    const enSection = sections.en;
    const titleTranslations = {};
    const descriptionTranslations = {};

    for (const [locale, data] of Object.entries(sections)) {
      if (locale === 'en') continue; // English stays in the main fields
      if (data.title) titleTranslations[locale] = data.title;
      if (data.description) descriptionTranslations[locale] = data.description;
    }

    // Update the event: set description to English only, populate translations
    const { error: updateError } = await supabase
      .from('events')
      .update({
        description: enSection.description,
        title_translations: titleTranslations,
        description_translations: descriptionTranslations,
      })
      .eq('id', event.id);

    if (updateError) {
      console.error(`Failed to update ${event.id} (${event.title}):`, updateError.message);
    } else {
      updated++;
      console.log(`✓ ${event.title}`);
      console.log(`  EN desc: ${enSection.description.slice(0, 80)}...`);
      console.log(`  Translations: ${Object.keys(titleTranslations).join(', ')}`);
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped: ${skipped}`);
}

migrate();
