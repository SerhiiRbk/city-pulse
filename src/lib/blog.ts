import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  city?: string;
  tags: string[];
  image?: string;
  content: string;
  locale: string;
}

const CONTENT_DIR = path.join(process.cwd(), 'content', 'blog');

export function getAllPosts(locale: string): BlogPost[] {
  const dir = path.join(CONTENT_DIR, locale);
  if (!fs.existsSync(dir)) return [];

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));

  const posts = files.map((file) => {
    const slug = file.replace(/\.md$/, '');
    const fullPath = path.join(dir, file);
    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
      slug,
      title: data.title || '',
      description: data.description || '',
      date: data.date || '',
      city: data.city || undefined,
      tags: data.tags || [],
      image: data.image || undefined,
      content,
      locale,
    } as BlogPost;
  });

  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(locale: string, slug: string): BlogPost | null {
  const fullPath = path.join(CONTENT_DIR, locale, `${slug}.md`);
  if (!fs.existsSync(fullPath)) return null;

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    slug,
    title: data.title || '',
    description: data.description || '',
    date: data.date || '',
    city: data.city || undefined,
    tags: data.tags || [],
    image: data.image || undefined,
    content,
    locale,
  };
}

export function getAllSlugs(): { locale: string; slug: string }[] {
  const locales = ['en', 'ru', 'uk', 'de', 'es', 'cs'];
  const results: { locale: string; slug: string }[] = [];

  for (const locale of locales) {
    const dir = path.join(CONTENT_DIR, locale);
    if (!fs.existsSync(dir)) continue;
    fs.readdirSync(dir)
      .filter((f) => f.endsWith('.md'))
      .forEach((f) => {
        results.push({ locale, slug: f.replace(/\.md$/, '') });
      });
  }

  return results;
}

export async function markdownToHtml(markdown: string): Promise<string> {
  const result = await remark().use(html, { sanitize: false }).process(markdown);
  return result.toString();
}
