import "server-only";
import Image from "next/image";
import Link from "next/link";
import { storyblokEditable, type SbBlokData } from "@storyblok/react/rsc";
import ContactForm from "../ContactForm";
import { getPostsPage, getStories, getStoriesByUuids, getStoryBySlug, resolveCaseStudyStoriesForLocale } from "../../lib/storyblok-data";
import { buildHomeV2Model, homeEditorialDate, HOME_V2_COPY, type HomeWork } from "../../lib/home-v2";
import type { Story, StoryblokBlock, SupportedLanguage } from "../../utils/types";

type Copy = typeof HOME_V2_COPY.en | typeof HOME_V2_COPY["es-co"];
const editable = (blok?: StoryblokBlock) => blok ? storyblokEditable(blok as SbBlokData) : {};

async function publishedCases(body: StoryblokBlock[], locale: SupportedLanguage): Promise<Story[]> {
  const section = body.find(blok => blok.component === "case_studies_section");
  const values = Array.isArray(section?.case_studies) ? section.case_studies : [];
  const uuids = values.flatMap(value => {
    const uuid = typeof value === "string" ? value : value && typeof value === "object" && "uuid" in value ? value.uuid : null;
    return typeof uuid === "string" && uuid.length === 36 && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(uuid) ? [uuid] : [];
  });
  const stories = await getStoriesByUuids({ uuids: [...new Set(uuids)], locale: "en", version: "published" });
  return resolveCaseStudyStoriesForLocale({
    stories, locale, version: "published",
    fetchAlternate: async (slug, alternateLocale) => (await getStoryBySlug({ slug, locale: alternateLocale, version: "published" })).story,
    onWarning: () => {},
  });
}

function SectionHeading({ index, title, description, id }: { index: string; title: string; description?: string; id: string }) {
  return <header className="home-v2-section-heading">
    <p className="home-v2-eyebrow"><span aria-hidden="true">{index} / </span>{title}</p>
    <h2 id={id}>{description || title}</h2>
  </header>;
}

function WorkCard({ work, index, copy, compact = false }: { work: HomeWork; index: number; copy: Copy; compact?: boolean }) {
  const external = work.kind === "project";
  return <article className={"home-v2-work" + (compact ? " home-v2-work-compact" : " home-v2-work-lead")}>
    {work.image && <div className="home-v2-work-image">
      <Image src={work.image.src} alt={work.image.alt || work.title} width={1200} height={760}
        sizes="(min-width: 960px) 560px, (min-width: 640px) 50vw, 100vw" />
    </div>}
    <div className="home-v2-work-content">
      <p className="home-v2-eyebrow"><span aria-hidden="true">{String(index + 1).padStart(2, "0")} / </span>{work.kind === "case-study" ? copy.caseStudy : copy.project}</p>
      <h3>{work.title}</h3>
      {work.facts.length > 0 ? <dl className="home-v2-work-facts">{work.facts.map(fact => <div key={fact.label}>
        <dt>{copy[fact.label]}</dt><dd>{fact.text}</dd>
      </div>)}</dl> : <p className="home-v2-work-description">{work.description}</p>}
      {work.technologies.length > 0 && <ul className="home-v2-technologies" aria-label={copy.technologiesLabel}>
        {work.technologies.map(technology => <li key={technology}>{technology}</li>)}
      </ul>}
      <div className="home-v2-work-links">
        {work.href && <Link href={work.href} {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})} className="home-v2-text-link">
          {external ? copy.visitLink : copy.detailsLink}<span className="sr-only">: {work.title}</span><span aria-hidden="true">↗</span>
        </Link>}
        {work.sourceHref && <a href={work.sourceHref} target="_blank" rel="noopener noreferrer" className="home-v2-text-link">
          {copy.sourceLink}<span className="sr-only">: {work.title}</span><span aria-hidden="true">↗</span>
        </a>}
      </div>
    </div>
  </article>;
}

export default async function HomeV2({ story, locale }: { story: Story; locale: SupportedLanguage }) {
  const body = story.content.body || [];
  // Home data is secondary to the profile: a CMS collection failure must not
  // remove contact details or display fabricated work/writing placeholders.
  const [postsResult, casesResult, categoriesResult] = await Promise.allSettled([
    getPostsPage({ version: "published", locale, perPage: 3 }),
    publishedCases(body, locale),
    getStories({ version: "published", startsWith: "categories/", contentType: "Category", perPage: 100 }),
  ]);
  const model = buildHomeV2Model({ body, locale,
    posts: postsResult.status === "fulfilled" ? postsResult.value : [],
    caseStudies: casesResult.status === "fulfilled" ? casesResult.value : [],
    categories: categoriesResult.status === "fulfilled" ? categoriesResult.value.stories : [],
  });
  const copy = HOME_V2_COPY[locale];
  const postsHref = locale === "es-co" ? "/es-co/posts" : "/posts";
  const socialLinks = [
    { label: "LinkedIn", href: "https://www.linkedin.com/in/jhonattan-benitez-752b3650/" },
    { label: "GitHub", href: "https://github.com/jhonattanbenitez/" },
    { label: "Fiverr", href: "https://www.fiverr.com/jhonattanb07" },
  ];
  return <main {...storyblokEditable(story.content)} className="home-v2" id="home-v2-main" tabIndex={-1}>
    <div className="home-v2-container">
      <section {...editable(model.hero)} id="home" className="home-v2-hero" aria-labelledby="home-v2-title">
        <div className="home-v2-hero-copy">
          <p className="home-v2-eyebrow">{copy.eyebrow}</p>
          <h1 id="home-v2-title">{locale === "en"
            ? <>{copy.headline.split("real-world")[0]}<span className="home-v2-nowrap">real-world</span>{copy.headline.split("real-world")[1]}</>
            : copy.headline}</h1>
          <p className="home-v2-hero-description">{copy.description}</p>
          <div className="home-v2-hero-actions">
            <a className="home-v2-button" href="#projects">{copy.workCta}<span aria-hidden="true">↘</span></a>
            <Link className="home-v2-text-link" href={postsHref}>{copy.writingCta}<span aria-hidden="true">↗</span></Link>
          </div>
        </div>
        <aside className="home-v2-identity" aria-label="Jhonattan Benitez">
          {model.portrait && <div className="home-v2-portrait"><Image src={model.portrait.src} alt={copy.portraitAlt} width={300} height={360} preload
            sizes="(min-width: 960px) 300px, 112px" /></div>}
          <div className="home-v2-identity-caption">
            <p className="home-v2-name">Jhonattan Benitez</p><p className="home-v2-role">{copy.role}</p>
            <ul className="home-v2-socials" aria-label={locale === "es-co" ? "Perfiles profesionales" : "Professional profiles"}>
              {socialLinks.map(link => <li key={link.label}><a href={link.href} target="_blank" rel="noopener noreferrer">{link.label}<span aria-hidden="true">↗</span></a></li>)}
            </ul>
          </div>
        </aside>
      </section>

      <section id="projects" className="home-v2-section home-v2-selected" aria-labelledby="home-v2-work-title">
        <span id="case-studies" className="home-v2-anchor" />
        <SectionHeading index="01" title={copy.selected} description={copy.selectedIntro} id="home-v2-work-title" />
        <div className="home-v2-work-grid">
          {model.selectedWork.map((work, index) => <WorkCard key={work.id} work={work} index={index} copy={copy} compact={index > 0} />)}
        </div>
        {model.moreWork.length > 0 && <details className="home-v2-more-work"><summary>{copy.moreWork}<span aria-hidden="true">({model.moreWork.length}) +</span></summary>
          <div className="home-v2-more-grid">{model.moreWork.map((work, index) => <WorkCard key={work.id} work={work} index={index + model.selectedWork.length} copy={copy} compact />)}</div>
        </details>}
      </section>

      <section id="expertise" className="home-v2-section" aria-labelledby="home-v2-expertise-title">
        <SectionHeading index="02" title={copy.expertise} description={copy.expertiseIntro} id="home-v2-expertise-title" />
        <div className="home-v2-expertise-grid">{copy.expertiseItems.map(([title, description], index) => <article key={title}>
          <span className="home-v2-eyebrow" aria-hidden="true">0{index + 1}</span><h3>{title}</h3><p>{description}</p>
        </article>)}</div>
      </section>

      <section id="writing" className="home-v2-section home-v2-writing" aria-labelledby="home-v2-writing-title">
        <div className="home-v2-heading-row"><SectionHeading index="03" title={copy.writing} description={copy.writingIntro} id="home-v2-writing-title" />
          <Link href={postsHref} className="home-v2-text-link">{copy.allWriting}<span aria-hidden="true">↗</span></Link></div>
        {model.writing.length > 0 ? <ol className="home-v2-writing-list">{model.writing.map(post => <li key={post.id}>
          <article><time dateTime={post.date.slice(0, 10)}>{homeEditorialDate(post.date, locale)}</time>
            <div className="home-v2-writing-content"><h3><Link href={post.href}>{post.title}<span aria-hidden="true">↗</span><span className="sr-only"> — {copy.readArticle}</span></Link></h3>
              {(post.category || post.readingMinutes) && <ul className="home-v2-writing-meta">
                {post.category && <li>{post.category}</li>}
                {post.readingMinutes && <li>{post.readingMinutes} {copy.readingEstimate}</li>}
              </ul>}
            </div>
          </article>
        </li>)}</ol> : <p className="home-v2-muted">{copy.writingEmpty}</p>}
      </section>

      <section {...editable(model.about)} id="about" className="home-v2-section home-v2-about" aria-labelledby="home-v2-about-title">
        <SectionHeading index="04" title={copy.about} description={copy.aboutTitle} id="home-v2-about-title" />
        <div className="home-v2-about-content"><p className="home-v2-about-lead">{copy.aboutLead}</p>
          <div className="home-v2-credentials">
            {model.biography && <details className="home-v2-background"><summary>{copy.aboutDetails}<span aria-hidden="true">+</span></summary><p className="home-v2-biography">{model.biography}</p></details>}
            {model.details.map(group => <details key={group.id}>
            <summary>{copy[group.id]}<span aria-hidden="true">+</span></summary>
            <ul>{group.items.map((item, index) => <li key={index}>{item}</li>)}</ul>
          </details>)}</div>
        </div>
      </section>

      <div className="home-v2-section home-v2-contact-region">
        <header className="home-v2-contact-intro"><p className="home-v2-eyebrow"><span aria-hidden="true">05 / </span>{locale === "es-co" ? "Contacto" : "Contact"}</p>
          <h2>{copy.contactTitle}</h2><p>{copy.contactIntro}</p><p className="home-v2-contact-secondary">{copy.contactSecondary}</p>
          <a className="home-v2-text-link" href={socialLinks[0].href} target="_blank" rel="noopener noreferrer">LinkedIn<span aria-hidden="true">↗</span></a>
        </header>
        {model.contact && <ContactForm blok={{ ...model.contact, title: copy.contactForm } as SbBlokData & { title: string }} />}
      </div>
      <footer className="home-v2-footer"><div><p>Jhonattan Benitez</p><span>{copy.footer}</span></div><a className="home-v2-text-link" href="#home">{copy.backTop}<span aria-hidden="true">↑</span></a></footer>
    </div>
  </main>;
}
