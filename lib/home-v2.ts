import type { Story, StoryblokBlock, SupportedLanguage } from "../utils/types";
import { markdownToPlainText } from "../utils/markdown.ts";

export type HomeAsset = { src: string; alt: string };
export type HomeWorkFact = { label: "problem" | "solution" | "contribution" | "outcome"; text: string };
export type HomeWork = {
  id: string;
  title: string;
  description: string;
  kind: "case-study" | "project";
  image: HomeAsset | null;
  href: string | null;
  sourceHref: string | null;
  technologies: string[];
  facts: HomeWorkFact[];
};
export type HomeWriting = { id: string; title: string; href: string; date: string; category: string | null; readingMinutes: number | null };
export type HomeDetailGroup = { id: "skills" | "education" | "certifications"; items: string[] };
export type HomeV2Model = {
  hero: StoryblokBlock | undefined;
  about: StoryblokBlock | undefined;
  contact: StoryblokBlock | undefined;
  portrait: HomeAsset | null;
  biography: string;
  selectedWork: HomeWork[];
  moreWork: HomeWork[];
  details: HomeDetailGroup[];
  writing: HomeWriting[];
};

const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value)
  ? value as Record<string, unknown> : {};
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];
const text = (value: unknown): string => typeof value === "string" ? value.trim() : "";
const safeSlug = (value: string): boolean => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.exec(value)?.[0] === value;

export function isHomeV2Path(pathname: string): boolean {
  return pathname === "/" || pathname === "/es-co";
}

/** CMS URLs are untrusted data. Only ordinary external HTTP(S) links are shown. */
export function homeExternalHref(value: unknown): string | null {
  const candidate = text(value);
  if (!candidate || /[\u0000-\u0020\u007f]/.test(candidate)) return null;
  try {
    const url = new URL(candidate);
    return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

function asset(value: unknown): HomeAsset | null {
  const image = record(Array.isArray(value) ? value[0] : value);
  const src = homeExternalHref(image.filename);
  return src ? { src, alt: text(image.alt) } : null;
}

function pathLeaf(fullSlug: string, section: "posts" | "case-studies"): string | null {
  const normalized = fullSlug.replace(/^\/?(?:en\/|es-co\/)?/, "");
  const parts = normalized.split("/");
  return parts.length === 2 && parts[0] === section && safeSlug(parts[1])
    ? parts[1] : null;
}

export function homeWritingHref(story: Story, locale: SupportedLanguage): string | null {
  const prefix = locale === "es-co" ? "/es-co/posts/" : "/posts/";
  if (story.editorial) {
    const href = story.editorial.href;
    return story.editorial.locale === locale && href.startsWith(prefix)
      && safeSlug(href.slice(prefix.length)) ? href : null;
  }
  const leaf = pathLeaf(story.full_slug, "posts");
  if (!leaf || story.content.language !== (locale === "es-co" ? "spanish" : "english")) return null;
  return prefix + leaf;
}

/** Input is already the published, locale-filtered collection from the existing facade. */
export function homeWritingItems(stories: readonly Story[], locale: SupportedLanguage, categories: readonly Story[] = []): HomeWriting[] {
  const seen = new Set<string>();
  const result: HomeWriting[] = [];
  for (const story of stories) {
    if (story.published === false || !story.published_at || story.content.component !== "post") continue;
    const href = homeWritingHref(story, locale);
    const identity = story.group_id || story.uuid;
    if (!href || !text(story.content.title) || seen.has(identity)) continue;
    seen.add(identity);
    result.push({ id: story.uuid, title: story.content.title, href, date: story.content.date,
      category: homeWritingCategory(story, categories, locale),
      readingMinutes: homeReadingMinutes(story.content.content, locale, story.content.intro, story.content.title),
    });
    if (result.length === 3) break;
  }
  return result;
}

/** Resolve existing category names by identity; never derive labels from a slug. */
export function homeWritingCategory(story: Story, categories: readonly Story[], locale: SupportedLanguage): string | null {
  const reference = story.content.category_ref;
  if (!reference) return null;
  const published = categories.filter(category => category.published !== false && category.published_at && category.content.component === "Category");
  const source = published.find(category => reference.id ? category.uuid === reference.id : category.full_slug === reference.cached_url);
  if (!source) return null;
  const language = locale === "es-co" ? "spanish" : "english";
  const target = source.content.language === language ? source : published.find(category =>
    category.content.language === language && (
      (source.group_id && category.group_id === source.group_id)
      || (source.alternates?.some(alternate => alternate.id === category.id)
        && category.alternates?.some(alternate => alternate.id === source.id))
    ));
  return target ? text(target.content.name) || text(target.content.title) || text(target.name) || null : null;
}

/** Estimate, not a measured duration: 200 readable words/minute, including code.
 * Reuse the article renderer's sanitized GFM dialect, so URLs, markup and unsafe
 * HTML do not inflate the estimate. An absent body has no honest estimate. */
export function homeReadingMinutes(markdown: unknown, locale: SupportedLanguage, intro?: string, title?: string): number | null {
  if (typeof markdown !== "string" || !markdownToPlainText(markdown)) return null;
  const visible = markdownToPlainText([title, intro, markdown].filter(Boolean).join("\n\n"));
  const words = [...new Intl.Segmenter(locale === "es-co" ? "es-CO" : "en-US", { granularity: "word" }).segment(visible)]
    .filter(segment => segment.isWordLike).length;
  return words ? Math.max(1, Math.ceil(words / 200)) : null;
}

function technologies(source: string): string[] {
  const labels: [string, RegExp][] = [
    ["React", /\bReact(?=\b|\d)/i], ["Next.js", /\bNext\.js(?=\b|\d)/i],
    ["Storyblok", /\bStoryblok\b/i], ["TypeScript", /\bTypeScript\b/i],
    ["PostgreSQL", /\bPostgreSQL\b/i], ["Prisma", /\bPrisma\b/i],
    ["Tailwind", /\bTailwind(?:\s?CSS)?(?=\b|\d)/i], ["Firebase", /\bFirebase\b/i], ["Auth.js", /\bAuth\.js\b/i],
  ];
  return labels.filter(([, pattern]) => pattern.test(source)).map(([label]) => label).slice(0, 4);
}

function projectWork(value: unknown): HomeWork | null {
  const project = record(value);
  const title = text(project.title);
  if (!title) return null;
  const description = text(project.description);
  return {
    id: text(project._uid) || title,
    title, description, kind: "project", image: asset(project.image),
    href: homeExternalHref(record(project.previewUrl).url),
    sourceHref: homeExternalHref(record(project.gitUrl).url),
    technologies: technologies(description), facts: [],
  };
}

/** Only summarize explicitly titled sections; never infer a personal role or
 * measured outcome from a technology name or a project's marketing purpose. */
export function homeCaseFacts(markdown: string, locale: SupportedLanguage): HomeWorkFact[] {
  const headings = [...markdown.matchAll(/^#{1,6}[ \t]+(.+)$/gm)];
  const patterns: [HomeWorkFact["label"], RegExp][] = [
    ["problem", /^(?:(?:the )?client challenge|el desafío del cliente)(?:\s*\(|$)/i],
    ["solution", /^(?:proposed solution|la solución propuesta)(?:\s*\(|$)/i],
    ["outcome", /^(?:results and client impact|resultados e impacto para el cliente)$/i],
  ];
  return patterns.flatMap(([label, pattern]) => {
    const index = headings.findIndex(heading => pattern.test(markdownToPlainText(heading[1])));
    if (index < 0) return [];
    const heading = headings[index];
    const section = markdown.slice(heading.index! + heading[0].length, headings[index + 1]?.index).trim();
    // Prefer the explicitly documented qualitative outcome to a collection of
    // numerical claims; retain the source's wording instead of inventing a KPI.
    const qualitativeOutcome = label === "outcome" ? section.split("\n").find(line =>
      /^\s*[-*]\s+(?:\*\*)?(?:Data Retention|Retención de Datos)\s*:/i.test(line)) : undefined;
    const paragraph = qualitativeOutcome || section.split(/\n[ \t]*\n/).find(part => markdownToPlainText(part));
    if (!paragraph) return [];
    const plain = markdownToPlainText(paragraph);
    const sentence = [...new Intl.Segmenter(locale === "es-co" ? "es-CO" : "en-US", { granularity: "sentence" }).segment(plain)][0]?.segment.trim();
    const value = plain.length <= 360 ? plain : sentence && sentence.length <= 360 ? sentence : "";
    return value ? [{ label, text: value }] : [];
  });
}

function caseWork(story: Story, locale: SupportedLanguage): HomeWork | null {
  if (story.published === false || !story.published_at || story.content.component !== "case_study") return null;
  const leaf = pathLeaf(story.full_slug, "case-studies");
  const title = text(story.content.title) || text(story.name);
  if (!leaf || !title) return null;
  return {
    id: story.uuid, title, description: text(story.content.intro), kind: "case-study", image: asset(story.content.image),
    href: (locale === "es-co" ? "/es-co/case-studies/" : "/case-studies/") + leaf,
    sourceHref: null,
    technologies: technologies(text(story.content.content)),
    facts: homeCaseFacts(text(story.content.content), locale),
  };
}

function detailItems(value: unknown): string[] {
  return list(value).flatMap(group => list(record(group).content).map(item => text(record(item).item))).filter(Boolean);
}

export function buildHomeV2Model({ body, locale, posts = [], caseStudies = [], categories = [] }: {
  body: readonly StoryblokBlock[];
  locale: SupportedLanguage;
  posts?: readonly Story[];
  caseStudies?: readonly Story[];
  categories?: readonly Story[];
}): HomeV2Model {
  const find = (component: string) => body.find(block => block.component === component);
  const hero = find("hero"), about = find("about"), contact = find("contact");
  const projects = list(find("projects")?.project).map(projectWork).filter((item): item is HomeWork => item !== null);
  const cases = caseStudies.map(story => caseWork(story, locale)).filter((item): item is HomeWork => item !== null);
  const preferred = ["Wasabi", "Woodford Reserve"];
  const selectedProjects = preferred.map(title => projects.find(project => project.title.toLocaleLowerCase().includes(title === "Woodford Reserve" ? "woodford" : title.toLocaleLowerCase()))).filter((item): item is HomeWork => !!item);
  const selectedWork = [...cases.slice(0, 1), ...selectedProjects];
  for (const project of projects) {
    if (selectedWork.length === 3) break;
    if (!selectedWork.some(item => item.id === project.id)) selectedWork.push(project);
  }
  const moreWork = [...projects, ...cases].filter(work => !selectedWork.some(selected => selected.id === work.id));
  const education = list(about?.education);
  const certificates = [...list(about?.certifications), ...education.filter(group => record(group).id === "certifications")];
  return {
    hero, about, contact, portrait: asset(hero?.profile), biography: text(about?.about_me),
    selectedWork, moreWork,
    details: [
      { id: "skills", items: detailItems(about?.skills) },
      { id: "education", items: detailItems(education.filter(group => record(group).id !== "certifications")) },
      { id: "certifications", items: [...new Set(detailItems(certificates))] },
    ],
    writing: homeWritingItems(posts, locale, categories),
  };
}

export function homeEditorialDate(date: string, locale: SupportedLanguage): string {
  const day = /^(\d{4}-\d{2}-\d{2})/.exec(date)?.[1];
  if (!day) return "";
  const parsed = new Date(day + "T00:00:00Z");
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day ? new Intl.DateTimeFormat(locale === "es-co" ? "es-CO" : "en-US", {
    day: "numeric", month: "short", year: "numeric", timeZone: "UTC",
  }).format(parsed) : "";
}

export const HOME_V2_COPY = {
  en: {
    eyebrow: "Software Engineer · Frontend & Product Engineering",
    headline: "Building thoughtful software for real-world problems.",
    description: "I turn complex requirements into intuitive, reliable digital experiences — from product interfaces to complete platforms.",
    workCta: "Explore my work", writingCta: "Read my writing", portraitAlt: "Jhonattan Benitez", role: "Software Engineer",
    selected: "Selected work", selectedIntro: "A closer look at the products, platforms and web experiences I work on.",
    caseStudy: "Case study", project: "Web project", detailsLink: "Explore the case study", visitLink: "Visit website", sourceLink: "View source", technologiesLabel: "Technologies",
    problem: "Problem", solution: "Solution", contribution: "Contribution", outcome: "Outcome",
    moreWork: "More projects", expertise: "Expertise", expertiseIntro: "A considered approach, from interface to implementation.",
    expertiseItems: [
      ["Frontend & Product Engineering", "React and TypeScript interfaces, with attention to accessibility and how people use a product."],
      ["Architecture & Integrations", "Connecting interfaces, content management and operational workflows into coherent platforms."],
      ["Performance & User Experience", "Clear interactions, accessible experiences and practical improvements to existing websites."],
    ],
    writing: "Latest writing", writingIntro: "Notes on software, architecture and the decisions behind the code.", allWriting: "All articles", readArticle: "Read article",
    writingEmpty: "New writing will appear here when it is published.", readingEstimate: "min read · estimated",
    about: "About", aboutTitle: "Good software starts with understanding.",
    aboutLead: "I’m Jhonattan Benitez, a software engineer focused on frontend development, accessibility and thoughtful web experiences.",
    aboutDetails: "Background and approach", skills: "Skills", education: "Education", certifications: "Certifications",
    contactTitle: "Let’s build something considered.",
    contactIntro: "Have a role, a product challenge or an idea worth discussing? I’d love to hear about it.",
    contactSecondary: "For independent projects, we can also talk about the right scope and approach.",
    contactForm: "Start a conversation", footer: "Built with care. Always a work in progress.", backTop: "Back to top", skip: "Skip to content",
  },
  "es-co": {
    eyebrow: "Ingeniero de software · Frontend y desarrollo de producto",
    headline: "Software bien pensado para problemas reales.",
    description: "Transformo requisitos complejos en experiencias digitales intuitivas y confiables, desde interfaces de producto hasta plataformas completas.",
    workCta: "Explora mi trabajo", writingCta: "Lee mis artículos", portraitAlt: "Jhonattan Benitez", role: "Ingeniero de software",
    selected: "Trabajo seleccionado", selectedIntro: "Una mirada a los productos, plataformas y experiencias web en los que trabajo.",
    caseStudy: "Caso de estudio", project: "Proyecto web", detailsLink: "Explora el caso de estudio", visitLink: "Visita el sitio", sourceLink: "Ver código", technologiesLabel: "Tecnologías",
    problem: "Problema", solution: "Solución", contribution: "Contribución", outcome: "Resultado",
    moreWork: "Más proyectos", expertise: "Áreas de enfoque", expertiseIntro: "Un enfoque cuidadoso, desde la interfaz hasta la implementación.",
    expertiseItems: [
      ["Frontend y desarrollo de producto", "Interfaces con React y TypeScript, con atención a la accesibilidad y a cómo las personas utilizan un producto."],
      ["Arquitectura e integraciones", "Conectar interfaces, gestión de contenido y flujos operativos para construir plataformas coherentes."],
      ["Rendimiento y experiencia de usuario", "Interacciones claras, experiencias accesibles y mejoras prácticas en sitios existentes."],
    ],
    writing: "Artículos recientes", writingIntro: "Ideas sobre software, arquitectura y las decisiones detrás del código.", allWriting: "Todos los artículos", readArticle: "Leer artículo",
    writingEmpty: "Los nuevos artículos aparecerán aquí cuando se publiquen.", readingEstimate: "min de lectura · estimados",
    about: "Sobre mí", aboutTitle: "El buen software empieza por entender.",
    aboutLead: "Soy Jhonattan Benitez, ingeniero de software enfocado en desarrollo frontend, accesibilidad y experiencias web bien pensadas.",
    aboutDetails: "Experiencia y enfoque", skills: "Habilidades", education: "Educación", certifications: "Certificaciones",
    contactTitle: "Hablemos de lo que quieres construir.",
    contactIntro: "¿Tienes una oportunidad profesional, un reto de producto o una idea que vale la pena explorar? Me gustaría conocerla.",
    contactSecondary: "Para proyectos independientes, también podemos conversar sobre el alcance y el enfoque adecuados.",
    contactForm: "Inicia una conversación", footer: "Hecho con cuidado. Siempre en evolución.", backTop: "Volver al inicio", skip: "Saltar al contenido",
  },
} as const;
